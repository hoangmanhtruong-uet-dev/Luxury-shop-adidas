# KẾ HOẠCH KHẮC PHỤC LỖI PRE-GOLIVE (FINAL AUDIT REMEDIATION PLAN)

> **Nguyên tắc thực hiện cho AI Agent:**
>
> 1. Thực hiện tuần tự từng Phase, **không** sửa gộp tất cả cùng lúc.
> 2. Sau khi hoàn thành mỗi mục, chạy kiểm tra TypeScript (`npx tsc --noEmit`) và đánh dấu `[x]` vào checkbox tương ứng.
> 3. Không tự ý chạy các lệnh xóa dữ liệu Database (`prisma db push --accept-data-loss`, `migrate reset`).

---

## 🚨 PHASE 0: CẮT CẦU DAO & CHẶN RÒ RỈ DỮ LIỆU (LÀM NGAY LẬP TỨC)

- [x] **0.1. Tách biệt `.env` Local và Production (Critical #3)**
  - Mở `.env`, xóa hoặc comment dòng `DATABASE_URL` thứ 2 (dòng 13 trỏ vào `aivencloud.com`).
  - Chỉ giữ lại `DATABASE_URL="mysql://root:123456@127.0.0.1:3306/website_banhang"` cho môi trường local.
- [x] **0.2. Cập nhật `.gitignore` chặn lộ Secret & Backup (Critical #2, #4, Nitpick)**
  - Thêm các dòng sau vào `.gitignore`:
    ```gitignore
    tong_hop_dich_vu_mtruong_store.md
    backups/
    *.sql
    *.tsbuildinfo
    ```
  - Chạy `git rm --cached tsconfig.tsbuildinfo` và `git rm --cached -r backups/` (nếu đang được track).

---

## 💰 PHASE 1: TIỀN BẠC, THANH TOÁN & LỆNH BUILD (LAUNCH BLOCKERS)

- [x] **1.1. Loại bỏ lệnh gây mất dữ liệu khi Build (Critical #5)**
  - File: `package.json:8`
  - Sửa `"build"` thành: `"prisma generate && next build"` (bỏ `prisma db push --accept-data-loss`).
  - Thêm script: `"db:deploy": "prisma migrate deploy"`.
- [x] **1.2. Khóa tính năng Nạp tiền Demo trên Production (Critical #6)**
  - File: `src/lib/security/manual-wallet-mutation-policy.ts:19-20`
  - Chặn `operation === 'demo-top-up'` khi `NODE_ENV === 'production'` (hoặc bắt buộc kiểm tra `process.env.ENABLE_DEMO_WALLET === 'true'`).
  - File: `src/app/(shop)/profile/bank/page.tsx:234` — Ẩn nút UI `"⚡ Nạp demo ngay"` khi ở môi trường Production.
- [x] **1.3. Mở khóa Origin Policy cho Webhook VNPay & PayOS (Critical #12)**
  - File: `src/lib/security/origin-policy.ts:35-46`
  - Thêm `/api/payments/vnpay/ipn` (POST) và `/api/payments/payos/webhook` (POST) vào `API_MUTATION_ORIGIN_EXEMPTIONS` để request M2M không bị chặn 403 `ORIGIN_REQUIRED`.
- [x] **1.4. Vá lỗ hổng Webhook PayOS (Critical #7)**
  - File: `src/app/api/payments/payos/webhook/route.ts:26-48`
  - Kiểm tra `body.success === true && body.code === '00'` trước khi xử lý. Nếu thất bại, chỉ ack `{ success: true }` nhưng không set `PAID`.
  - Đối chiếu `webhookData.amount` phải khớp với `order.total`.
  - Gọi qua `PaymentService.recordWebhookSuccess` để tạo bản ghi payment, trừ kho (`InventoryService.consumeForPayment`) và ghi wallet ledger.
  - Nếu `order === null`, trả về status lỗi (404/500) để PayOS còn retry, không trả `{ success: true }` sớm.
- [x] **1.5. Vá lỗi IDOR & Thao túng giá tại VNPay Create URL (Critical #9)**
  - File: `src/app/api/payments/vnpay/create-url/route.ts:44-53`
  - Query DB kiểm tra `order` tồn tại và thuộc về `session.userId`:
    `const order = await prisma.order.findFirst({ where: { id: body.orderId, userId: session.userId } });`
  - Xóa `amount` khỏi request schema của client, sử dụng `order.total` từ DB để tạo URL thanh toán.
  - Bổ sung Rate Limit cho endpoint này.
- [x] **1.6. Chuẩn hóa VNPay IPN theo State Machine & Outbox (Warning W18)**
  - File: `src/app/api/payments/vnpay/ipn/route.ts:63-93`
  - Không update chay `paymentStatus: 'completed'`. Đưa về luồng `PaymentService` / state machine chuẩn để consume inventory, ghi ledger và bắn event `ORDER_PAID` vào outbox.
- [x] **1.7. Tách PayOS SDK ra khỏi Database Transaction (Warning W6)**
  - File: `src/app/api/orders/route.ts:48`
  - Tách lệnh gọi PayOS SDK ra ngoài `prisma.$transaction`, cấu hình timeout 8000ms để tránh treo transaction làm rollback mất đơn khi PayOS phản hồi chậm.

---

## 🔒 PHASE 2: BẢO MẬT, XÁC THỰC (AUTH) & CẤU HÌNH HỆ THỐNG

- [x] **2.1. Chống Stored XSS qua JSON-LD (Critical #8)**
  - File: `src/app/(shop)/products/[id]/page.tsx:195-220` (và toàn bộ các file có dùng `dangerouslySetInnerHTML` cho JSON-LD).
  - Escape chuỗi JSON trước khi render:
    `JSON.stringify(jsonLd).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')`
  - File: `src/lib/validations/index.ts:23,27` — Bổ sung validate lọc ký tự thẻ HTML cho tên sản phẩm/danh mục, kết hợp cấu hình `Content-Security-Policy` trong `next.config.js`.
- [x] **2.2. Vá lỗ hổng Google OAuth Callback (Critical #10)**
  - File: `src/app/api/auth/callback/route.ts:10, 36, 54, 69`
  - Xóa `console.log` chứa full URL và OAuth code ở dòng 10.
  - Thêm kiểm tra `if (!user.isActive)` thì trả về 403 (chặn tài khoản đã bị khóa).
  - Thay `Math.random()` bằng `crypto.randomBytes(32).toString('hex')` khi sinh `refreshToken` và lưu `tokenHash` vào bảng `session` trong DB.
- [x] **2.3. Bảo vệ Middleware cho `/api/admin/*`, `/api/seller/*`, `/api/shipper/*` (Warning W1, W17)**
  - File: `src/middleware.ts:106-172` — Bổ sung kiểm tra phân quyền cho cả các nhánh `/api/admin`, `/api/seller`, `/api/shipper` để tránh sót route quên gọi `getSession()`.
  - File: `src/lib/auth/auth.ts:24` — Sửa lại hàm `canAccessShipper` cho đúng logic role.
- [x] **2.4. Thu hồi Session khi khóa User & Tăng bảo mật 2FA / PIN (Warning W2, W3)**
  - File: `src/app/api/admin/users/[id]/toggle-active/route.ts:23` — Xóa/revoke toàn bộ session trong DB của user ngay khi bị admin khóa tài khoản.
  - File: `src/app/api/auth/2fa/disable/route.ts`, `2fa/generate/route.ts`, `user/payment-pin/route.ts` — Yêu cầu xác thực mật khẩu hiện tại (`bcrypt.compare`) + mã TOTP hợp lệ, đồng thời thêm Rate Limit.
- [x] **2.5. Khai báo `CRON_SECRET`, `TRUST_PROXY` và chuẩn hóa `env.ts` (Critical #11, #13, Nitpick)**
  - File: `src/config/env.ts` & `.env.example`
  - Khai báo và validate `CRON_SECRET` (`z.string().min(32)` bắt buộc trên production), `TRUST_PROXY`, cùng các biến đang đọc chay từ `process.env` (`PAYOS_*`, `WEBHOOK_SECRET`, `API_ALLOWED_ORIGINS`, `NEXT_PUBLIC_SUPABASE_*`, `INVENTORY_*`, `OUTBOX_*`).
  - File: `src/app/api/admin/cron/outbox/route.ts` & `flash-sale/route.ts` — Bắt buộc kiểm tra `CRON_SECRET` ở mọi môi trường (chặn trường hợp `Bearer undefined`).
  - Bật `TRUST_PROXY=true` trên production để Rate Limiter không gộp toàn bộ người dùng vào chung 1 bucket `direct-client`.
- [x] **2.6. Xử lý trùng Route `/` và xung đột `robots.txt` (Critical #17, #18)**
  - Giữ lại 1 file trang chủ duy nhất giữa `src/app/page.tsx` và `src/app/(shop)/page.tsx`, xóa file bị trùng.
  - Xóa `public/robots.txt` để quy tắc chặn `/admin/`, `/api/`, `/seller/`, `/profile/` trong `src/app/robots.ts` có hiệu lực.

---

## ⚡ PHASE 3: NÂNG CẤP THƯ VIỆN, DATABASE INDEX & HIỆU NĂNG

- [x] **3.1. Vá lỗ hổng RCE/SSRF trên Next.js & Đồng bộ React 19 (Critical #1, #14)**
  - File: `package.json`
  - Nâng cấp `"next": "^16.3.8"` (hoặc bản vá mới nhất) và cập nhật `sharp`.
  - Đồng bộ `"react": "^19.2.0"`, `"react-dom": "^19.2.0"`, `"@types/react": "^19.2.0"`, `"@types/react-dom": "^19.2.0"`, và nâng `eslint-config-next` lên bản 16 tương ứng.
  - Chạy `npm install` và kiểm tra bằng `npm audit --omit=dev`.
- [x] **3.2. Sửa lỗi chỉ hiển thị 20/2000 sản phẩm & N+1 Query (Critical #15, Warning W7, W8)**
  - File: `src/app/api/products/route.ts:31` — Đọc query params `page` và `limit` (mặc định 20, tối đa 50), tính `skip = (page - 1) * limit` và trả về tổng số trang.
  - File: `src/lib/idGenerator.ts:15,49` — Bỏ `findMany()` toàn bảng; đổi sang `findFirst({ orderBy: { id: 'desc' }, select: { code: true } })` hoặc dùng sequence/nanoid để tránh O(N) và race condition.
  - Bổ sung phân trang (`take` / `skip`) cho 18 điểm gọi `findMany` chưa có giới hạn (`order.service.ts:161`, `admin/orders`, `me/orders`, `admin/users`, `admin/inventory`, `admin/analytics`, `seller/analytics`, `shipper/orders`, `sitemap.ts`).
- [x] **3.3. Bổ sung Index cho bảng `Order` và `Product` (Critical #16)**
  - File: `prisma/schema.prisma`
  - Thêm vào model `Order`: `@@index([userId, createdAt])`, `@@index([createdAt])`, `@@index([status, createdAt])`.
  - Thêm vào model `Product`: `@@index([stockQuantity])`.
  - Tạo migration chuẩn bằng lệnh `npx prisma migrate dev --name add_missing_indexes`.
- [x] **3.4. Chuẩn hóa mã lỗi DB 503, ẩn lỗi thô & thêm Timeout (Warning W4, W5, W10)**
  - File: `src/lib/api-handler.ts:55-57` — Với các mã lỗi hạ tầng Prisma (`P1001`, `P1002`, `P1008`, `P2024`, `P2034`), trả về HTTP `503` (`DATABASE_UNAVAILABLE`) thay vì `400`.
  - File: `src/app/api/admin/vouchers/route.ts:25` & `admin/users/[id]/balance/route.ts:51` — Không trả trực tiếp `error.message` của Prisma/MySQL về cho client.
  - File: `src/lib/supabase/client.ts` (cùng Resend/Cloudinary) — Gắn `AbortSignal.timeout(8000)` cho custom fetch để tránh treo serverless function 300s.

---

## 🛠️ PHASE 4: GIAO DIỆN LỖI, SEO, CI/CD & WORKER

- [x] **4.1. Bổ sung trang 404/500 & sửa Soft 404 (Warning W9, Nitpick)**
  - Tạo `src/app/not-found.tsx`, `src/app/error.tsx`, và `src/app/global-error.tsx` có giao diện đồng bộ.
  - Tại `src/app/(shop)/products/[id]/page.tsx:134-145` và `categories/[slug]/page.tsx:69-76`: Gọi hàm `notFound()` của `next/navigation` khi không tìm thấy dữ liệu thay vì trả về HTTP 200.
- [x] **4.2. Làm sạch SEO Metadata, Sitemap & Privacy (Nitpick)**
  - File: `src/components/common/Navbar.tsx:141` — Không gửi thẳng `user.name` chưa encode sang `ui-avatars.com` (dùng avatar nội bộ hoặc `encodeURIComponent` cho chữ cái viết tắt).
  - Xóa hậu tố `| MTRUONG-STORE` bị lặp ở 10 file child layout/page (do root layout đã có template `%s | MTRUONG-STORE`).
  - File: `src/app/sitemap.ts` — Thêm filter `approved: true` cho category và sửa URL thành `/categories/[slug]`.
  - Đặt `robots: { index: false, follow: false }` cho các khu vực `(admin)`, `(seller)`, `(shipper)`, `profile`, `checkout`.
- [x] **4.3. Thống nhất kiến trúc Worker & Cron (Warning W13, W14, W15)**
  - Chọn 1 cơ chế chạy Outbox duy nhất (Worker tiến trình trên Render **hoặc** Cron Serverless), không chạy song song gây trùng `workerId`.
  - Tại `src/app/api/admin/cron/outbox/route.ts:20`: Gắn thêm `crypto.randomUUID()` vào `workerId` để tránh đụng độ lock.
  - Tại `scripts/workers/outbox-worker.ts`: Giảm `OUTBOX_SHUTDOWN_TIMEOUT_MS` xuống `8000` (< 10s SIGTERM của Render) và thoát tiến trình sạch sẽ.
- [x] **4.4. Sửa lại Pipeline CI/CD (Warning W11, W12)**
  - Gộp `.github/workflows/ci.yml` và `verify.yml` làm một, thêm `permissions: contents: read`, `concurrency`, và bước `npm audit --omit=dev --audit-level=high`.
  - Cập nhật script `lint` tương thích với Next 16 và khớp các script `test:*` trong `package.json`.

---

## 🔑 PHASE 5: CHECKLIST THỦ CÔNG TRÊN DASHBOARD (TRƯỚC GIỜ GO-LIVE)

- [ ] **5.1. Rotate (Đổi mới) toàn bộ Secret đã bị lộ + chuyển DB sang Supabase:**
  - Reset DB password trên Supabase dashboard + đặt `DATABASE_URL` (pooler 6543) và `DIRECT_URL` (direct 5432) theo `PHASE5_RUNBOOK.md` §5.1 (đã cập nhật Postgres — bỏ qua hướng dẫn Aiven cũ).
  - Xem thêm `PHASE5_RUNBOOK.md` §5.6 để chuyển dữ liệu Aiven → Supabase bằng pgloader.
    `?ssl-mode=REQUIRED&connection_limit=5&pool_timeout=20&connect_timeout=10`
  - Tạo lại `RESEND_API_KEY`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`.
  - Sinh mới 3 `JWT_SECRET` và `CRON_SECRET` (tối thiểu 32 ký tự ngẫu nhiên).
- [ ] **5.2. Xóa vĩnh viễn file `.sql` khỏi Git History trên Remote:**
  - Chuyển GitHub repo sang chế độ **Private** (nếu đang Public).
  - Dùng `git filter-repo --path backups/website_banhang_before_fulfillment_20260802_024415.sql --invert-paths` và force push lên `origin/main`.
  - Bắt buộc đổi mật khẩu & xóa toàn bộ phiên đăng nhập (`session`) của 4 tài khoản bị lộ hash trong file SQL dump.
