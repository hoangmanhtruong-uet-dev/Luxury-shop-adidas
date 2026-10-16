# KẾ HOẠCH FIX HẠ TẦNG & VẬN HÀNH (AUDIT LẦN 2 — RED TEAM)

> **QUYẾT ĐỊNH PLATFORM: VERCEL** (chốt ngày 2026-10-16).
> Hệ quả: `npm start` → `next start`; `start-all.ts` deprecated (chỉ giữ cho local);
> mọi background job chạy qua `vercel.json` cron (hiện 4 job → **bắt buộc gói Pro**,
> Hobby chỉ cho tối đa 2 cron chạy daily).
>
> Nguồn: báo cáo Red Team Hạ tầng & Vận hành (S1–S10 + phát hiện phụ).
> File song sinh: `fix_plan_codebase.md` (F1–F17, data integrity). Các mục overlap được đánh dấu
> `↗ F-x` — chi tiết domain nằm bên đó, bên này chỉ làm phần ops/deploy/monitor.
>
> Quy ước: `[file : dòng]` -> `[vấn đề]` -> `[cách fix]`. Checkbox `- [ ]` để triển khai từng phase.

---

## 🔴 P0 — BLOCKER (xong mới được go-live)

### OP1. Chốt platform: Vercel XOR Render — không để song song ✅ DONE (Vercel)
- [`vercel.json` + `package.json:9`] -> Hai topology loại trừ nhau cùng tồn tại.
- Đã làm:
  - [x] Quyết định: **Vercel** (cron là đường outbox duy nhất).
  - [x] `start` → `next start`; giữ `start:legacy-all` cho local; `start-all.ts` gắn header DEPRECATED.
  - [x] `vercel.json`: 4 cron (outbox + inventory + flash-sale + maintenance) + `maxDuration: 60` cho 2 cron nặng.
  - [ ] Xác nhận gói **Pro** trên dashboard (4 cron/phút không chạy được ở Hobby).
  - [ ] Viết `docs/deployment.md` (platform, process, schedule, nơi xem log).

### OP2. Env boot safety — app thiếu 1 biến là chết cả health check ✅ DONE (code) / ⬜ dashboard
- [`src/config/env.ts:176-181` + `src/middleware.ts:4-5`] -> `throw` ở module scope.
- Đã làm:
  - [x] `scripts/preflight.ts` (dùng đúng `@next/env` loader để khớp `next build`; fail trong vài giây, nêu tên biến; chặn `ENABLE_DEMO_WALLET=true` ở prod).
  - [x] `build` = `tsx scripts/preflight.ts && prisma generate && next build`.
  - [x] CI step "Preflight (production env schema)" với `NODE_ENV=production` + secrets fake (đã verify fail đúng khi thiếu).
  - [ ] Điền đủ 7 biến bắt buộc lên Vercel dashboard (list trong `PHASE5_RUNBOOK.md` §5.1).

### OP3. Worker supervision — 1 lỗi là worker chết vĩnh viễn ✅ DONE (code, topology Vercel)
- [`src/lib/services/outbox/outbox-worker.ts:134-138` + `scripts/workers/start-all.ts:47-49`] -> runLoop chết vĩnh viễn; start-all kill cả 2 process, không restart, không `process.exit`.
- Đã làm:
  - [x] `runLoop`: guard từng iteration + backoff mũ (cap 5 phút, jitter) + `waitForBackoff` interruptible — không bao giờ chết vĩnh viễn.
  - [x] `start-all.ts` deprecated (topology Vercel không dùng supervisor này nữa) — thay vì viết lại supervision cho file không còn chạy prod.
  - [ ] (Sau chốt Vercel) mục "tách service riêng" không còn áp dụng — worker = cron `dispatchOnce` stateless.

### OP4. Shutdown timeout: default code 30s > grace period ✅ DONE
- [`src/lib/services/outbox/outbox.service.ts:134`] -> default 30s, cả 2 entrypoint không truyền explicit.
- Đã làm:
  - [x] Default code `30_000` → `8_000`; `scripts/workers/outbox-worker.ts:39` truyền explicit `shutdownTimeoutMs: 8_000`. (Trên Vercel cron còn được `maxDuration: 60` ở `vercel.json` bù thêm.)
  - [x] `.env.example` đã ghi 8000 (Phase 4.3) — đồng bộ 3 nơi.

### OP5. Rate limit fail-closed + off-by-one + không retry deadlock ✅ DONE (code)
- [`src/lib/rate-limit/rate-limit-backend.ts:29-34,192-202` + `:133` vs `:183`] -> fail-closed + không retry + lệch boundary.
- Đã làm:
  - [x] `withRetryOnDeadlock` (3 lần, jittered backoff, chỉ retry P2034/P2024) bọc `increment`.
  - [x] Thống nhất boundary `<=` cả 2 hàm (admit đúng `max` request/window).
  - [x] Giữ `failureMode:'closed'` cho login (mở = brute-force window — quyết định có chủ ý).
  - [ ] Xác nhận `TRUST_PROXY=true` trên Vercel dashboard (đã có superRefine chặn boot nếu false).

### OP6. DB pool: 2 client × default pool, không pooler ⬜ một nửa (còn việc dashboard)
- [`src/lib/db.ts` (`new PrismaClient()` trần)] -> Không `connection_limit`; Vercel scale ngang nhân pool.
- Đã làm:
  - [x] `.env.example`: template `PROD_DATABASE_URL` kèm công thức tính `connection_limit` + lưu ý đơn vị giây.
- Còn lại (cần số liệu thật, không code thay được):
  - [ ] Tra giới hạn connection/compute gói Supabase → gắn `DATABASE_URL` (pooler 6543 + `?pgbouncer=true`) và `DIRECT_URL` (direct 5432) trên Vercel dashboard.
  - [ ] Nếu > 2 instance: PgBouncer/ProxySQL trước MySQL (task M, sau go-live nếu metric đỏ).

---

## 🟠 P1 — HIGH (làm ngay sau P0, trước/sát go-live)

### OP7. Observability tối thiểu — hiện tại cháy không ai ngửi thấy
- Bằng chứng: 39 `console.error` rải khắp `src/app/api` (không requestId, không structure); `login/route.ts:88` log stack; 0 integration error-tracking; 0 uptime monitor; 0 alert.
- Fix (mức tối thiểu chấp nhận được, ~1 ngày):
  - [ ] Gắn Sentry (free tier) qua `src/instrumentation.ts` (`register()` + `Sentry.init`), nối `api-handler.ts` (đã có `requestId`) vào trace. Xóa `console.error` ở các route đã qua `createHandler` (giữ lại ở route legacy chưa migrate).
  - [ ] Uptime check 60s/lần vào **`/api/health/ready`** (không phải `/live`) bằng Better Stack/UptimeRobot free; alert SMS/Slack khi `not_ready` > 3 phút.
  - [ ] Alert dead-letter: cron 5 phút query `/api/admin/outbox/dead-letters` (hoặc COUNT trực tiếp), page khi `REFUND_REQUIRED` dead-letter > 0 (ngưỡng đã có `OUTBOX_DEAD_LETTER_CRITICAL_THRESHOLD=1`).
  - [ ] Gom stdout JSON (logger đã JSON ở prod) về Logtail/Papertrail hoặc Render log stream — quyết 1 nơi, ghi vào `docs/deployment.md`.

### OP8. CSP chặn pixel marketing ✅ DONE (code) / ⬜ verify trình duyệt
- [`next.config.js` (CSP) vs `src/components/common/Analytics.tsx:15-60`] -> bật pixel là bị chặn sạch.
- Đã làm:
  - [x] Thêm GA4/Meta/TikTok vào `script-src` + endpoint thu thập vào `connect-src`; gỡ `ui-avatars.com` khỏi `img-src` (không còn request nào).
  - [ ] Bật cả 3 ID ở staging → DevTools 0 CSP violation + Pixel Helper báo PageView.

### OP9. Kill-switch `maintenanceMode` phải có tác dụng thật ✅ DONE (code, triển khai theo hướng env)
- Quyết định triển khai: **env-based, không DB-based.** Lý do: middleware edge không query DB mỗi request được; flag DB (`siteconfig.maintenanceMode`) giữ nguyên làm display-only.
- Đã làm:
  - [x] `MAINTENANCE_MODE` vào env schema (`env.ts`); middleware enforce đầu tiên: bật = 503 + `Retry-After: 300` cho mọi route trừ `/admin*`, `/api/admin*`, `/login`, `/api/health`, `/api/auth`.
  - [x] `.env.example` document rõ 2 flag khác nhau (tránh nhầm).
  - [ ] Test staging: bật flag → curl `/`, `/api/products`, `/admin` kỳ vọng 503/503/200.

### OP10. Schedule cho các job hiện chỉ chạy tay ✅ DONE (code) / ⬜ nâng limit + readiness gauge
- ↗ Chi tiết F3 (expiry), F6 (idempotency cleanup) ở `fix_plan_codebase.md`.
- Đã làm:
  - [x] `src/lib/security/cron-guard.ts` dùng chung (timing-safe, mọi môi trường).
  - [x] `GET /api/admin/cron/inventory` (`* * * * *`) — release reservation hết hạn.
  - [x] `GET /api/admin/cron/maintenance` (hourly) — idempotency cleanup + rate buckets + expired sessions.
  - [x] `vercel.json`: 4 cron + `maxDuration: 60` cho outbox/inventory.
  - [ ] Nâng tạm `INVENTORY_MAX_ACTIVE_ORDERS_PER_USER` trên prod trước khi cron ổn định.
  - [ ] Gauge reservation quá hạn vào `/api/health/ready`.

### OP11. Backup tự động + restore rehearsal
- ↗ Chi tiết F1 ở `fix_plan_codebase.md` (script, bucket, env, readiness 503 khi backup > 26h, xóa nút fake). Không lặp lại — đây là dependency của checklist rollback §Rollback.

### OP12. Pin toolchain ✅ DONE (code) / ⬜ money:audit CI (thuộc F2)
- Đã làm:
  - [x] `engines: { node: ">=20.9.0" }` + `.nvmrc` (`22`, khớp CI) + `packageManager: npm@11.13.0`.
  - [ ] `money:audit` vào CI (↗ F2 ở `fix_plan_codebase.md`).

---

## 🟡 P2 — Verify (sau khi P0+P1 xong, chạy như gate trước giờ G)

### OP13. Smoke-test script hóa ✅ DONE (script) / ⬜ chạy gate cuối
- Đã làm:
  - [x] `scripts/smoke-prod.sh` (`npm run smoke:prod`): health, ready, 4 cron (401 không secret / 200 có secret), webhook không 403, admin/seller không auth → 401, demo top-up bị từ chối, robots disallow /admin. Fail 1 check = exit 1.
  - [ ] Chạy sau mỗi deploy staging + 1 lần cuối trên prod trước khi mở traffic.

---

## Thứ tự thực hiện đề xuất (cập nhật sau chốt Vercel)

| # | Mục | Mức | Effort | Trạng thái |
|---|---|---|---|---|
| 1 | OP1 — chốt platform (Vercel), dẹp start-all | P0 | S | ✅ code xong; ⬜ xác nhận gói Pro + `docs/deployment.md` |
| 2 | OP2 — preflight env + check CI | P0 | S | ✅ xong (đã verify fail đúng) |
| 3 | OP4 — default shutdown 8s + explicit | P0 | S | ✅ xong |
| 4 | OP5 — retry P2034 + boundary + TRUST_PROXY | P0 | S | ✅ code xong; ⬜ TRUST_PROXY dashboard |
| 5 | OP6 — pooler Supabase (DATABASE_URL + DIRECT_URL) | P0 | S | ⬜ gắn dashboard + check gói |
| 6 | OP3 — worker recover | P0 | M | ✅ xong (start-all deprecated thay vì viết lại) |
| 7 | OP10 — cron inventory/maintenance | P0 | S | ✅ code + schedule xong; ⬜ nâng limit tạm, readiness gauge |
| 8 | OP8 — CSP pixel | P1 | S | ✅ code xong; ⬜ verify trình duyệt |
| 9 | OP9 — enforce maintenanceMode (env-based) | P1 | S | ✅ code xong; ⬜ test staging |
| 10 | OP12 — pin Node | P1 | S | ✅ xong; money:audit CI thuộc F2 |
| 11 | OP7 — Sentry + uptime + dead-letter alert + gom log | P1 | M | ⬜ chưa làm (dịch vụ ngoài) |
| 12 | OP11 — backup tự động + rehearsal | P1 | M | ⬜ thuộc F1 |
| 13 | OP13 — smoke script | P2 | S | ✅ script xong; ⬜ chạy gate cuối |

## Điểm đã tốt — giữ nguyên

- CI đã gọn (gộp 1 file, gitleaks, audit gate, SHA-pin, `permissions`, `concurrency` — Phase 4.4).
- `money:static` + `order-state:audit` pass; build/typecheck/lint xanh.
- `cleanup-security-buckets.ts` đã dọn `rateLimitBucket` đúng — chỉ thiếu schedule (OP10).
- `SessionService.cleanupExpiredSessions` đã được gọi trong cleanup — chỉ thiếu schedule (OP10).
- Env schema production đã chặn boot khi thiếu biến quan trọng (Phase 2.5) — OP2 biến nó thành preflight rõ ràng thay vì crash mù.
