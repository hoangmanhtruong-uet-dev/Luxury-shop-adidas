# KẾ HOẠCH FIX ĐỢT 2 — DATA INTEGRITY & RECOVERY (AUDIT LẦN 2)

> Nguồn: báo cáo audit "Data Integrity & Recovery" (17 phát hiện F1–F17).
> Đã đối chiếu source: F1 (settings route là stub), F2 (money-audit crash), F4 (guard thiếu) — xác nhận đúng.
> **Loại trừ:** hạng mục PayOS webhook status-casing (tương đương POS-01) — đã fix xong ở Phase 1.4
> (`recordWebhookSuccess` + `transitionOrderInTransaction` + check `body.success`/`code==='00'` + đối chiếu amount),
> đã verify bằng đọc source. Không lặp lại ở đây.
>
> Quy ước: `[file : dòng]` -> `[vấn đề]` -> `[cách fix]`. Ưu tiên P0 trước go-live.

---

## 🔴 P0 — BLOCKER (chưa xong thì chưa go-live)

### F3. Inventory expiry không chạy ở đâu → khóa checkout vĩnh viễn + hết hàng ảo
- [`src/lib/services/fulfillment/inventory.service.ts:235` + `scripts/maintenance/inventory-jobs.ts:7`] -> `InventoryExpiryWorker` chỉ tồn tại dưới dạng script chạy tay (`npm run inventory:expire`); `vercel.json` chỉ cron 2 route outbox/flash-sale; `OutboxWorker.poll()` không gọi expiry; `/api/health/ready` không check reservation quá hạn.
- Hệ quả đã trace: checkout bỏ dở để lại reservation ACTIVE vĩnh viễn; sau 3 lần bỏ dở user **không bao giờ đặt hàng được nữa** (`PENDING_ORDER_LIMIT`, `inventory.service.ts:52-61`, max 3); `reservedQuantity` không bao giờ giảm → sản phẩm "hết hàng" giả trên toàn sàn.
- Fix:
  1. Thêm `GET /api/admin/cron/inventory` với guard `Bearer CRON_SECRET` timing-safe (copy pattern `cron/outbox/route.ts:23-37`), gọi `InventoryExpiryWorker.runBatch()`; thêm schedule `* * * * *` vào `vercel.json`.
  2. Đồng thời gọi `InventoryExpiryWorker.runBatch()` trong `OutboxWorker.poll()` để phủ topology Render (worker chạy liên tục, không cron).
  3. Thêm gauge reservation quá hạn vào `/api/health/ready`.
  4. Mitigation ngay trước launch: nâng `INVENTORY_MAX_ACTIVE_ORDERS_PER_USER` trong `.env` production để hard-lockout không kích hoạt.

### F2. `money:audit` crash trước khi chạy query nào — toàn bộ đối soát tài chính đang chết
- [`scripts/audit/money-audit.ts:25-28`] -> `readFileSync` 4 path cũ không còn tồn tại (`src/lib/services/order.service.ts`, `payment.service.ts`, `late-payment-refund.service.ts`, `outbox-consumers.ts`); file thật đã chuyển vào subfolder. `ENOENT` ném đồng bộ trong `main()`, mà `main().finally()` ở dòng 85 **không có `.catch`** → unhandled rejection, chết process, 4 query drift (dòng 42-54) không bao giờ chạy.
- Fix:
  1. Sửa 4 path thành `src/lib/services/order/order.service.ts`, `src/lib/services/payment/payment.service.ts`, `src/lib/services/payment/late-payment-refund.service.ts`, `src/lib/services/outbox/outbox-consumers.ts`.
  2. Thêm `npm run money:audit` vào `.github/workflows/ci.yml` (job đã có MySQL + `migrate deploy`, chạy được live query).
  3. Bọc `main()` bằng `.catch(e => { console.error(e); process.exitCode = 1; })`.

### F1. Không có backup thật — nút "backup" là stub đánh lừa operator
- [`src/app/api/admin/settings/route.ts:93-103`] -> action `backup` chỉ `upsert siteconfig.lastBackupAt` và trả message "demo"; không dump, không snapshot, không external call. UI `admin/settings/page.tsx:209` render như nút thật. Không có `mysqldump`/PITR/schedule ở bất kỳ đâu (chỉ có prose trong `docs/backup-restore-runbook.md` + checkbox chưa tick ở `docs/production-checklist.md:26`).
- Fix:
  1. Viết `scripts/maintenance/db-backup.sh` (`pg_dump "$DIRECT_URL" -Fc`, chạy bằng GitHub Actions `schedule: cron`, upload ra bucket ngoài Supabase, lifecycle 30 ngày).
  2. Thêm `BACKUP_BUCKET_URL` + `BACKUP_MAX_AGE_HOURS` vào `src/config/env.ts`.
  3. Job restore-rehearsal hàng tháng: restore vào schema scratch + chạy `money:audit`.
  4. `/api/health/ready` trả 503 khi `lastBackupAt` quá 26h (do backup job ghi row thật).
  5. Xóa/sửa nút fake.

### F4. `POST /api/payments` nhận order `expired`/`payment_review` → trừ tiền thật, kho không trừ
- [`src/lib/services/payment/payment.service.ts:37-38`] -> guard chỉ chặn `paid` / `refunded`+`cancelled`/`returned`; `expired` và `payment_review` lọt qua. `transitionData` (`order-state.service.ts:152-173`) không có nhánh `expired` nên order hết hạn giữ `paymentStatus='pending'`. Qua được guard → debit ví, tạo `payment` + `walletLedger`, rồi `consumeForPayment` trả `'late'` nhưng **return value bị discard ở dòng 63** → order kẹt `payment_review` chờ refund tay, hàng đã hoàn về pool có thể đã bán cho người khác.
- Fix: thay 2 guard rời rạc bằng check state machine — chỉ cho qua khi `['pending','payment_failed'].includes(order.status) && ['pending','failed'].includes(order.paymentStatus)`; đồng thời assert return của `consumeForPayment`, throw `ConflictError('INVENTORY_LATE')` khi `'late'` để debit muộn không bao giờ commit im lặng.

### F5. Nhánh VNPay-failure không release reservation → retry bằng ví trừ tiền nhưng order kẹt `payment_failed`
- [`src/app/api/payments/vnpay/ipn/route.ts:109-126`] -> khi `!result.isSuccess` chỉ transition sang `PAYMENT_FAILED` + `paymentStatus='failed'`, **không gọi `InventoryService.releaseOrder`**. User retry bằng ví: qua guard (F4), ví bị debit, `consumeForPayment` consume kho, nhưng transition status bị skip vì `order.status !== 'pending'` (`inventory.service.ts:131`) → kho trừ, tiền trừ, order vẫn `payment_failed`; lối thoát duy nhất là admin flip tay về `pending`.
- Fix: trong nhánh failure, gọi `InventoryService.releaseOrder(tx, order.id, 'RELEASED', ...)` cùng transaction; sửa điều kiện `inventory.service.ts:131` thành `['pending','payment_failed'].includes(order.status)` để retry tự heal. (Lưu ý: route PayOS cố tình KHÔNG advance order khi fail — cần thống nhất semantic 2 gateway.)

---

## 🟠 P1 — HIGH (fix trước hoặc ngay sau go-live, có alert)

### F6. Không có cleanup job cho `idempotency_record`; 10 bảng khác không có đường xóa
- [`src/lib/services/idempotency.service.ts:124` + `scripts/maintenance/cleanup-idempotency.ts:8`] -> `cleanup` chỉ có 2 caller (định nghĩa + script tay); không cron, không worker, không CI. Retention 72h/168h/720h, mỗi row ôm full serialized order trong `responseBody LongText` (`schema.prisma:766`) → tăng vô hạn trên cùng instance với ví. `cleanup` chỉ xóa `COMPLETED` nên row `PROCESSING` kẹt tồn tại vĩnh viễn mà không alert.
- 10 bảng KHÔNG có `delete`/`deleteMany` ở bất kỳ đâu (`outbox_event`, `processed_outbox_event`, `webhook_event`, `domain_audit_log`, `order_status_transition`, `inventory_movement`, `notification_delivery`, `payment`, `refund`, `wallet_ledger`) → disk quota Supabase đầy thì instance đứng.
- Fix: thêm `GET /api/admin/cron/maintenance` (guard `CRON_SECRET`), schedule hourly, gọi `IdempotencyService.cleanup` + `cleanup-security-buckets`; gọi `IdempotencyService.cleanup(50)` mỗi vòng `OutboxWorker.poll()`; archive hàng tháng cho `outbox_event`/`processed_outbox_event`/`webhook_event`; review capacity hàng quý cho bảng tài chính.

### F10. Tiền bị convert sang JS float ở 3 path payment; `money-static` không scan các file đó
- [`src/app/api/payments/vnpay/ipn/route.ts:53-54`] `Math.round(Number(order.total))` — đây là check authorize duy nhất của IPN, lại chấp nhận underpayment 1 VND (`> 1`).
- [`src/app/api/payments/vnpay/create-url/route.ts:70`] `Math.round(Number(order.total))` — amount gửi sang VNPay.
- [`src/app/api/orders/route.ts:74`] `Number(created.total)` — amount gửi PayOS; total dạng `"150000.0000"` lẻ thập phân thành amount non-integer VND → PayOS reject → đơn treo unpaid.
- [`src/lib/services/payment/vnpay-provider.ts:163`] `Math.round(Number(params.vnp_Amount) / 100)`.
- `scripts/audit/money-static.mjs:3-8` chỉ scan 4 file service, regex dòng 13 đủ bắt các case trên nếu file được liệt kê → CI báo "passed" trên cây đang có 4 vi phạm.
- Fix: thay cả 4 bằng Decimal (`Money.compare(Money.toDecimal(String(result.amount)), order.total) !== 0`); truyền `Money.serialize(order.total)` cho adapter và convert integer một chỗ sau assert `Money.isInteger()`; mở rộng `money-static.mjs` walk `src/app/api/**/route.ts`; đổi tolerance `> 1` ở vnpay ipn thành `!== 0`.

### F7. `/api/webhook` không có guard "đã paid" → charge trùng ở gateway bị drop im lặng
- [`src/app/api/webhook/route.ts:69-70`] -> gọi `recordWebhookSuccess` với mọi `status==='success'`, không check `paymentStatus`/`status` như 2 route PayOS/VNPay. `payment.upsert({where:{orderId}, update:{}})` thành no-op khi đã có payment ví; `providerIdempotencyKey`/`providerTransactionId` của gateway bị **discard**; `consumeForPayment` trả `'duplicate'`; route vẫn 200. Kết quả: user bị charge 2 lần ở gateway, lần 2 không tồn tại ở DB — mất tiền không thể đối soát.
- Fix: tại dòng 69, nếu order đã `paid`/`refunded` (hoặc status `paid`/`delivered`/`refunded`) thì ghi `domainAuditLog` (`action:'WEBHOOK_DUPLICATE_PAYMENT'`, details `{provider, eventId, orderTotal}`) rồi mới 200. Tốt hơn: `recordWebhookSuccess` throw `DuplicatePaymentError` khi upsert trúng row có `provider !== input.provider`.

### F11. Voucher burn lúc tạo đơn, không bao giờ hoàn khi cancel/expire/refund
- [`src/lib/services/order/order.service.ts:69-79`] -> claim atomic đúng (`updateMany` + `usedCount < usageLimit`), nhưng grep toàn repo: write `usedCount` duy nhất ở dòng 77; `releaseOrder` (`inventory.service.ts:182-224`) không biết gì về voucher. Mọi checkout bỏ dở/expiry/cancel đốt vĩnh viễn 1 lượt; với `usageLimit: 100` + F3, 1 bot đốt sạch voucher trong ~3 phút.
- Fix: persist `voucher_redemption` (unique `orderId`) trong transaction tạo đơn; decrement `usedCount` trong `releaseOrder` và trong `RefundService.create` (`payment.service.ts:107-109`) khi `fullyRefunded`; thêm `CHECK (usedCount <= usageLimit)`.

### F12. Không có feature flag; `maintenanceMode` là kill-switch không có tác dụng
- Grep `featureFlag|FEATURE_|dark.?launch|canary|rollout` → 0 hit. Mọi change risky ship 100% traffic cùng lúc với code.
- `maintenanceMode` set được (`admin/settings/route.ts:63`) và đọc để hiển thị (`site-config/route.ts:30`) nhưng **không enforce ở đâu**: `middleware.ts:121-246` không check, không route nào reference → bật cũng như không.
- Enum `PaymentMethod` (`schema.prisma:27-33`) là dead code — app dùng String tự do `'COD'|'Banking'|'MoMo'|'PayOS'` so sánh case-sensitive ở 3 nơi.
- Fix: thêm bảng `feature_flag` + `isEnabled(key, default)`; trước hết short-circuit `maintenanceMode` ở đầu `middleware.ts` trả 503 cho non-admin route; gate provider payment và công thức total sau flag.

### F8. `orderCode` PayOS có thể collide; webhook resolve bằng `findFirst` non-unique
- [`src/app/api/orders/route.ts:107-109`] -> `Date.now()*1000 + rand(1000)`: chỉ 1000 bucket/ms → 2 checkout cùng ms collide p≈0.1% (tới được trong flash sale). `@@unique([idempotencyScope, idempotencyKey])` (`schema.prisma:400`) không bảo vệ `idempotencyScope` đơn lẻ → 2 order cùng `orderCode` được. Webhook `findFirst({where:{idempotencyScope}})` (`payos/webhook/route.ts:55-58`) trả row tùy ý; nếu 2 order cùng `total` thì check amount qua → tiền + kho đổ vào **nhầm order**, order thật stays `pending` rồi expire.
- Re-read trong transaction (dòng 89-92) comment "row lock" nhưng **không phải** `FOR UPDATE` thật (lock thật nằm ở `payment.service.ts:12`).
- Fix: thêm cột `payosOrderCode Int? @unique` trên `Order`, lookup theo đó; generator collision-free (sequence DB hoặc UUID-derived int, retry on conflict); đổi dòng 89-92 thành `SELECT ... FOR UPDATE` thật.

### F9. Invariant ví là tail-check, không phát hiện được drift cần bắt
- Ba unique key thật sự enforced (`WalletLedger.deterministicKey`, `refundId`, `Payment.orderId`) — chặn double-credit ở path refund, tốt. Nhưng **không** có `CHECK (balanceAfter = balanceBefore + amount)` / `CHECK (balance >= 0)` ở migration nào, dù `docs/money-and-currency.md:40` khẳng định DB có check. `money-audit.ts:60-62` chỉ liệt kê constraint chứ không assert tập expected.
- Check drift (`money-audit.ts:51-54`) so balance với `balanceAfter` của row ledger **mới nhất** — không bao giờ tính `SUM(amount)` → không phát hiện: (a) write balance không ledger; (b) chain gãy giữa; (c) row bị sửa/xóa giữa chain; (d) user chưa có ledger row nào (JOIN skip im lặng). Và theo F2, query này chưa từng chạy.
- Gap lớn hơn: `SellerSettlement`/`PayoutRequest`/`CodCollection` chuyển tiền thật (`fulfillment.service.ts:138-150`, `admin/payouts/[id]/route.ts:19-24`) nhưng **không chạm `user.balance`, không ghi `walletLedger`** → duyệt payout chỉ flip status, không có record tiền ra, không đối soát được.
- Fix: thay tail-check bằng invariant tổng thật (`user.balance <> COALESCE(SUM(amount),0)`); thêm 2 `CHECK` ở migration để doc thành sự thật; `money:audit` exit 1 khi drift + vào CI; payout ghi `walletLedger` (`entryType='SELLER_PAYOUT'`, âm) + `domainAuditLog` trong cùng transaction approve.

---

## 🟡 P2 — MEDIUM (lên lịch sau go-live)

### F13. Deploy không có ordering discipline, drift gate, fail-fast
- `package.json:8` build không chạy `migrate deploy` (đã bỏ `db push` đúng); `start-all.ts` không migration/check schema; `src/lib/db.ts` là `new PrismaClient()` trần. Deploy có migration pending vẫn green, lỗi nổ thành 500 `P2022`/`P2001` ở request đầu tiên chạm cột thiếu; `/api/health/ready` không check schema version.
- Web child spawn trước khi worker boot xong → có cửa sổ serving 500.
- `CREATE INDEX` migration mới assert `ALGORITHM=INPLACE, LOCK=NONE` trong comment nhưng MySQL **fallback im lặng** sang blocking copy khi không inplace được.
- Fix: release job chạy `prisma migrate diff --from-url $DATABASE_URL --to-schema-datamodel prisma/schema.prisma --exit-code` trước khi route traffic; thêm check count `_prisma_migrations` vào `/api/health/ready`; mọi `ALTER` trên `order`/`product`/`wallet_ledger` đi qua `gh-ost`/`pt-online-schema-change`.

### F14. Oversell đã chặn đúng; lỗ nằm quanh nó (3 lỗ)
- Đã verify: oversell concurrent **không thể** (conditional `UPDATE ... WHERE stockQuantity - reservedQuantity >= q` + `affected===1`, lock order `ORDER BY productId`, consume `updateMany` guard số lượng). `stockQuantity`/`reservedQuantity` là `Int`.
- Lỗ 1 — admin restock lost update: [`admin/inventory/[id]/route.ts:29-45`] đọc `stockQuantity`, cộng ngoài transaction, ghi đè → 2 restock concurrent mất 1 lần cộng; không chặn `stockQuantity < reservedQuantity` → sinh anomaly `INVALID_PRODUCT_COUNTS` mà `inventory:repair` từ chối sửa. Fix: `updateMany({where:{id}, data:{stockQuantity:{increment:qty}}})` + 409 nếu vi phạm `reservedQuantity <= stockQuantity`.
- Lỗ 2 — `releaseOrder` release kho trên order đã paid-late: [`inventory.service.ts:191-196`] chỉ validate status khi `target==='RELEASED'`; với `'EXPIRED'` vẫn release kho dù `paymentStatus` là `paid`/`paid_late`, rồi skip transition ở dòng 211 → order giữ `payment_review` trong khi kho đã bán lại. Không anomaly nào cover. Fix: hard-refuse `'EXPIRED'` khi `paymentStatus` paid/paid-late + thêm anomaly `EXPIRED_ON_PAID_ORDER`.
- Lỗ 3 — TTL 15 phút ngắn hơn bank transfer thật: `INVENTORY_RESERVATION_TTL_MINUTES=15` (`.env.example:100`); payer chậm → reservation expire → webhook nhánh `'late'` → `payment_review` → refund tay. Fix: `expiresAt` theo `paymentMethod` (gateway 15 phút, `Banking` 24h) qua param `expiresAt` sẵn có ở `reserveOrderItems:76`.

### F15. Overspend đã chặn đúng; retry loop sai lock-order, không backoff/jitter
- Đã verify: overspend bị chặn (`SELECT ... FOR UPDATE` user row đầu transaction + `Money.compare(balance,total)<0` reject). Không tìm thấy path overspend.
- Nhưng lock order mâu thuẫn giữa các path (order-create: user→product→reservation; payment-consume: order→reservation→product) → deadlock dưới tải; cả 4 retry loop (`idempotency.service.ts:59,93`, `inventory.service.ts:35,40`, `order-state.service.ts:285-291`, `fulfillment.service.ts:167-174`) retry 4 lần **không backoff/jitter** → contention kéo dài là fail hết, user thấy 409/500 trần. Rate limit chỉ per-user (3 active/10 phút) → account mới bypass.
- Fix: thống nhất lock order `order → product → reservation`; thêm jittered exponential backoff cho mọi vòng `P2034`; thêm rate limit per-IP và per-product cạnh per-user.

### F16. `quantity` không upper-bound; shipping/tax trong công thức total là dead code
- [`validations/index.ts:67`] `quantity: int().positive()` không trần; `order.service.ts:35` chỉ check integer>0; `mergedItems` cộng dồn trùng (`order.service.ts:40-43`) → `quantity: 2147483647` làm `Money.normalize` throw vượt `DECIMAL(19,4)` → **500 thay vì 400**, có thể overflow cột `Int`.
- `order.service.ts:88-89` hard-code `shippingFee`/`taxAmount = 0` → công thức doc (`total = subtotal - discount + shipping + tax`) không bao giờ chạy với input non-zero; check equation của `money:audit` chỉ validate identity.
- Fix: cap `quantity` (vd 999), reject thay vì merge entry trùng product; implement shipping/tax hoặc document vĩnh viễn zero.

### F17. DB-down trong lúc webhook: không persist gì → outage dài là mất confirmation vĩnh viễn
- PayOS route check amount + lookup **trước** khi write; generic route ghi `webhookEvent` **cùng transaction** với domain work → DB outage = không còn forensic record.
- Replay đã verify đúng cả 3 route (PayOS 2nd/3rd → "Already processed" 200; VNPay → `RspCode 02` dừng retry; generic → `P2002` catch + hash-match 200). Nhưng không có durable-inbox-first, không dead-letter webhook, không alert; retry window của provider là hữu hạn (giờ–ngày).
- Fix: ghi `webhookEvent` ở transaction riêng commit trước (status `PROCESSING`) → xử lý → update `COMPLETED`; reaper cron tìm `PROCESSING` > 10 phút → `FAILED` + page; thêm gauge backlog vào `/api/health/ready`.

---

## Thứ tự thực hiện đề xuất

| # | Mục | Mức | Effort |
|---|---|---|---|
| 1 | F3 — schedule inventory expiry (+ nâng limit tạm thời) | P0 | S |
| 2 | F2 — sửa 4 path `money-audit`, thêm vào CI | P0 | S |
| 3 | F1 — backup tự động + restore rehearsal + readiness alert | P0 | M |
| 4 | F4/F5 — guard state cho wallet-payment và VNPay-failure | P0 | S |
| 5 | F6 — schedule idempotency cleanup | P1 | S |
| 6 | F10 — Decimal ở 3 route tiền + mở rộng `money-static` | P1 | S |
| 7 | F7 — guard already-paid + audit row ở `/api/webhook` | P1 | S |
| 8 | F11 — hoàn voucher khi cancel/expire/refund | P1 | M |
| 9 | F12 — enforce `maintenanceMode` thật | P1 | S |
| 10 | F8 — cột `payosOrderCode` unique | P1 | M |
| 11 | F9 — invariant `SUM(amount)` + CHECK constraint | P1 | M |
| 12 | F13 — drift gate + schema check ở readiness | P2 | M |

## Điểm tốt — đừng sửa quá tay

- Outbox dispatcher là component mạnh nhất repo (`FOR UPDATE SKIP LOCKED`, lease renewal `leaseSeconds/3`, lease-guarded complete/fail, stale recovery, `Promise.allSettled` sau Phase 4.3).
- Order state machine thật (transition table + actor-edge + `statusVersion` optimistic locking + idempotency replay).
- `Payment.orderId @unique` là thứ chặn double-charge thật sự.
- Voucher claim atomic đúng; reservation guard race-free; module `Money` Decimal chuẩn.
