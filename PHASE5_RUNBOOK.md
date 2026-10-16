# PHASE 5 — RUNBOOK THỦ CÔNG TRƯỚC GIỜ GO-LIVE

> Phase 0–4 đã được triển khai trong codebase.
> Phase 5 **không thể tự động hóa** vì cần thao tác trực tiếp trên
> Render/Vercel/GitHub dashboard. File này là checklist bàn giao cho người vận hành.
>
> **Ưu tiên tuyệt đối:** 5.2 → 5.1. Mọi credential dưới đây phải coi là đã lộ.

---

## 5.2. Xử lý SQL dump trong Git history (LÀM ĐẦU TIÊN)

SQL dump `backups/website_banhang_before_fulfillment_20260802_024415.sql` đã từng được
commit và **đẩy lên `origin/main`**. Xác nhận:

```bash
git branch -r --contains $(git log --all --format="%H" --diff-filter=A -- "backups/*.sql" | head -1)
```

File chứa: bcrypt password hash, email, **số tài khoản ngân hàng + tên chủ**,
địa chỉ + SĐT, `session.tokenHash` + IP + User-Agent.

### Bước 1 — Dừng rò rỉ tái diễn

- [ ] Chuyển GitHub repo sang **Private** ngay lập tức.
- [ ] Xác nhận `tong_hop_dich_vu_mtruong_store.md` **không** còn trong working tree
      hoặc đã được `.gitignore` (Phase 0.2 đã thêm rule này).
- [ ] Xác nhận `.env` / `.env.local` **không** được track: `git ls-files | grep -i env`
      → chỉ được trả về `.env.example`.

### Bước 2 — Thu hồi phiên đăng nhập của các tài khoản bị lộ

Bcrypt hash là hash một chiều nhưng **crack offline được**, đặc biệt với mật khẩu
yếu từng nằm trong `prisma/seed.ts` (`Admin@123456`, `123456`, `User@123456`,
`Shipper@123`, `Seller@123456`).

- [ ] Ép đổi mật khẩu cho **toàn bộ** tài khoản từng xuất hiện trong dump.
- [ ] Xóa/thu hồi **mọi** session của các tài khoản đó:
      `UPDATE session SET revokedAt = NOW() WHERE userId IN (...);`
- [ ] Bật 2FA cho tất cả tài khoản admin/shipper.
- [ ] **Đánh giá nghĩa vụ thông báo sự cố** cho chủ thể dữ liệu (Nghị định 13/2023/NĐ-CP
      và GDPR): dump chứa dữ liệu cá nhân nhạy cảm (tài khoản ngân hàng, địa chỉ, SĐT).

### Bước 3 — Gỡ khỏi history

```bash
pip install git-filter-repo
git filter-repo --path backups/website_banhang_before_fulfillment_20260802_024415.sql --invert-paths
git push --force --mirror origin
```

- [ ] Sau khi purge: **liên hệ GitHub Support** để xóa cache/cached views và
      các fork đã tạo (dữ liệu đã push không thể "gọi lại" chỉ bằng force-push).
- [ ] Yêu cầu mọi người có fork clone lại repo.

---

## 5.1. Rotate toàn bộ Secret

Sinh secret mới (KHÔNG dùng lại giá trị cũ):

```bash
openssl rand -base64 32   # JWT / webhook
openssl rand -hex 32      # CRON_SECRET
```

### Database (Supabase Postgres — đã chuyển từ Aiven MySQL, 2026-10-16)

- [ ] Reset DB password (Supabase dashboard → Project Settings → Database).
- [ ] Đặt 2 connection string riêng biệt (schema đã có `directUrl`):
  ```ini
  # Runtime/serverless — qua Supavisor pooler, transaction mode:
  DATABASE_URL="postgresql://postgres.[ref]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
  # Migrate/deploy 1 lần — direct, KHÔNG qua pooler (DDL trong pooled txn-mode fail):
  DIRECT_URL="postgresql://postgres.[ref]:[PASSWORD]@db.[ref].supabase.co:5432/postgres"
  ```
  > `?pgbouncer=true` bắt buộc khi qua pooler — Prisma giữ prepared statement
  > per-connection, thiếu flag này giao dịch dài (checkout/webhook) sẽ lỗi.
  > Region ví dụ `ap-southeast-1` — thay bằng region thật của project.

### Token / API key

- [ ] `JWT_SECRET`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (≥ 32 ký tự)
- [ ] `CRON_SECRET` (≥ 32 ký tự) — **bắt buộc**, nếu thiếu cron sẽ 401 vĩnh viễn
- [ ] `WEBHOOK_SECRET` (≥ 32 ký tự)
- [ ] `RESEND_API_KEY`
- [ ] `PAYOS_API_KEY` + `PAYOS_CHECKSUM_KEY` (đổi cả hai; checksum dùng verify webhook)

### Biến môi trường bắt buộc trên production (Phase 2.5 đã thêm validation)

`src/config/env.ts` **sẽ throw và không boot** nếu thiếu:

| Biến | Ghi chú |
|---|---|
| `CRON_SECRET` | ≥ 32 ký tự |
| `TRUST_PROXY` | **phải là `"true"`** — nếu `false`, rate limit gộp tất cả user vào 1 bucket `direct-client` → cả website chỉ 5 lần đăng nhập / 15 phút |
| `WEBHOOK_SECRET` | ≥ 32 ký tự |
| `STORAGE_PROVIDER` | `cloudinary` (không được để `local`) |
| `CLOUDINARY_*` | bắt buộc khi `STORAGE_PROVIDER=cloudinary` |
| `NOTIFICATION_PROVIDER` | không được để `log` |
| `NEXT_PUBLIC_APP_URL` | bắt buộc **https** |

> **Không** đặt `ENABLE_DEMO_WALLET=true` ở production: nó bật lại endpoint nạp tiền demo.

---

## 5.3. Áp dụng migration baseline Postgres (sau khi đã backup)

> Chuyển Supabase 2026-10-16: 21 migration MySQL đã archive vào
> `prisma/migrations_archive_mysql/`; thay bằng baseline duy nhất
> `00000000000000_postgres_baseline` (schema + toàn bộ CHECK constraint tiền tệ,
> đã port sang PG). Supabase là DB **mới hoàn toàn** — không migrate từ Aiven,
> xem §5.6 chuyển dữ liệu.

```bash
# 1. Backup Supabase trước (xem docs/backup-restore-runbook.md)
pg_dump "postgresql://postgres.[ref]:[PASSWORD]@db.[ref].supabase.co:5432/postgres" \
  -Fc -f backup_$(date +%F).dump

# 2. Áp dụng (dùng DIRECT_URL — direct connection, không qua pooler)
npm run db:deploy
```

---

## 5.4. Chọn kiến trúc deploy (trước khi deploy lần đầu)

Hiện còn **hai chiến lược mâu thuẫn** — phải chọn một:

| | Vercel (serverless) | Render / VM |
|---|---|---|
| `npm start` → `start-all.ts` (web + worker) | ❌ không chạy | ✅ |
| `vercel.json` cron `* * * * *` | ✅ | ⚠️ trùng |
| Cron outbox | hỗ trợ | sẽ bị duplicate |

- [ ] **Nếu chọn Render/VM:** xoá `vercel.json`, dùng `npm start` (worker chạy liên tục).
      Đặt `OUTBOX_REQUIRED_WORKER_ID_PREFIX` để `/api/health/ready` nhận diện đúng worker.
- [ ] **Nếu chọn Vercel:** bắt buộc gói **Pro/Enterprise** (Hobby chỉ cho cron 1 lần/ngày,
      `* * * * *` sẽ bị reject). Worker chỉ chạy qua cron.
- [ ] **Kiểm tra sau khi chọn:** `curl -s -o /dev/null -w "%{http_code}" https://<host>/robots.txt`
      → phải là 200 **và** nội dung phải chứa `Disallow: /admin`.

---

## 5.5. Smoke test sau deploy

```bash
# Health
curl -s https://<host>/api/health      | jq .    # status: ok
curl -s https://<host>/api/health/ready | jq .    # status: ready (cần heartbeat worker)

# Cron (phải 200, nếu 401 -> CRON_SECRET sai)
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/admin/cron/outbox

# Webhook M2M phải qua được origin policy (không phải 403 ORIGIN_REQUIRED)
curl -s -X POST https://<host>/api/payments/payos/webhook  -d '{}' -H 'content-type: application/json'
curl -s -X POST https://<host>/api/payments/vnpay/ipn       -d '{}' -H 'content-type: application/json'
# Kỳ vọng: 400/500 từ handler, TUYỆT ĐỐI KHÔNG phải 403

# Bảo mật (phải 401/403)
curl -s -o /dev/null -w "%{http_code}\n" https://<host>/api/admin/users
curl -s -o /dev/null -w "%{http_code}\n" https://<host>/api/seller/products

# Demo wallet phải bị từ chối ở production
curl -s -X POST https://<host>/api/user/balance \
  -H 'content-type: application/json' -H 'Idempotency-Key: x' \
  -d '{"amount":"100000000"}' | jq .error.code   # kỳ vọng: MANUAL_WALLET_MUTATION_DISABLED
```

- [ ] Đặt hàng thật end-to-end (PayOS) → xác nhận webhook đánh dấu `paid`,
      **stock bị trừ**, ledger ghi đủ, email gửi được.
- [ ] Kiểm tra `/api/admin/outbox/dead-letters` rỗng sau vài phút.
- [ ] Kiểm tra `npx prisma migrate status` trên production để xác nhận không có
      migration nào pending.

---

## 5.6. Chuyển dữ liệu Aiven MySQL → Supabase Postgres (1 lần, làm tay)

> Supabase là DB mới; schema đã có (baseline §5.3) nhưng **dữ liệu còn nằm ở Aiven**.
> Dùng `pgloader` (chạy trên máy bạn, không phải production). Downtime: cần maintenance
> window — bật `MAINTENANCE_MODE=true` + redeploy trước khi chuyển, tắt sau khi verify.

```bash
# 1. Cài pgloader (máy chạy lệnh, không phải server)
#    Windows: dùng WSL2 (pgloader không có bản Windows native ổn định).

# 2. File migrate.load — thay credential thật (KHÔNG commit file này)
cat > /tmp/migrate.load <<'EOF'
LOAD DATABASE
  FROM mysql://avnadmin:PASSWORD@OLD-AIVEN-HOST:PORT/website_websiteban_hang
  INTO postgresql://postgres.REF:PASSWORD@db.REF.supabase.co:5432/postgres
WITH include drop, create tables, create indexes, reset sequences,
     workers = 4, concurrency = 1,
     default text to text
CAST type datetime to timestamptz drop default using zero-dates-to-null,
     type date to date drop default using zero-dates-to-null;
EOF
pgloader /tmp/migrate.load
```

Lưu ý đã biết trước (đừng bất ngờ):

- [ ] MySQL `BOOLEAN`/`TINYINT(1)` → PG `boolean`: pgloader cast tự động; verify bảng `user`, `product` (`inStock`, `isActive`).
- [ ] `DECIMAL(19,4)` → PG `numeric(19,4)` chính xác tuyệt đối — nhưng **chạy `npm run money:audit` ngay sau chuyển** để khẳng định không lệch 1 đồng.
- [ ] CHECK constraint PG validate toàn bộ row cũ khi load: nếu Aiven có row vi phạm (tiền âm, `reservedQuantity > stockQuantity`), load **fail giữa chừng**. Chạy `inventory:reconcile` + `money:audit` **trên Aiven trước** để dọn.
- [ ] `_prisma_migrations` trên Supabase phải chỉ chứa baseline: sau pgloader, xóa các row migration MySQL cũ trong bảng đó nếu bị copy sang, rồi `prisma migrate resolve --applied 00000000000000_postgres_baseline`.
- [ ] Sau verify: đổi `DATABASE_URL`/`DIRECT_URL` trên Vercel sang Supabase, redeploy, tắt maintenance, chạy `scripts/smoke-prod.sh`.
- [ ] Giữ Aiven read-only 7 ngày trước khi xóa (đường lui).