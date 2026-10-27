# ⚽ Cún-shop — Nền tảng Thương mại Điện tử Đa Nhà Bán (Chuyên Giày Đá Bóng & Phụ Kiện Thể Thao)

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-green?logo=prisma)](https://www.prisma.io/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.3-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Cún-shop** là nền tảng thương mại điện tử chuyên sâu về **Giày đá bóng chính hãng & Phụ kiện thể thao**, được kiến trúc theo mô hình **Đa nhà bán hàng (Multi-Vendor Marketplace)**. Hệ thống được xây dựng trên nền tảng **Next.js 16 (App Router + Turbopack)**, **PostgreSQL (Supabase)** và **Prisma ORM**, đáp ứng các tiêu chuẩn khắt khe về toàn vẹn dữ liệu tài chính, chống race condition tồn kho và bảo mật đa lớp.

---

## 📌 Mục lục

1. [Kiến trúc & Phân vùng Hệ thống](#-kiến-trúc--phân-vùng-hệ-thống)
2. [Các Tính năng Nổi bật](#-các-tính-năng-nổi-bật)
3. [Công nghệ Cốt lõi](#-công-nghệ-cốt-lõi)
4. [Yêu cầu Hệ thống](#-yêu-cầu-hệ-thống)
5. [Cài đặt Môi trường Phát triển (Local Dev)](#-cài-đặt-môi-trường-phát-triển-local-dev)
6. [Biến Môi trường (.env)](#-biến-môi-trường-env)
7. [Danh mục Lệnh Scripts & Vận hành](#-danh-mục-lệnh-scripts--vận-hành)
8. [Đánh giá Sẵn sàng Go-Live (Go-Live Audit & Checklist)](#-đánh-giá-sẵn-sàng-go-live-go-live-audit--checklist)
9. [Cấu trúc Thư mục Codebase](#-cấu-trúc-thư-mục-codebase)
10. [Tài liệu Nghiệp vụ & Runbooks](#-tài-liệu-nghiệp-vụ--runbooks)

---

## 🏛️ Kiến trúc & Phân vùng Hệ thống

Hệ thống được chia thành 4 phân vùng ứng dụng độc lập trên cùng một codebase Next.js App Router:

| Phân vùng | Đường dẫn chính | Đối tượng & Chức năng |
| :--- | :--- | :--- |
| **Storefront** | `/(shop)` & `/(auth)` | Khách hàng mua sắm, duyệt danh mục, giỏ hàng, checkout VietQR/PayOS, quản lý đơn hàng, ví tiền, voucher, đánh giá sản phẩm. |
| **Seller Center** | `/(seller)/seller/*` | Kênh người bán: Đăng ký shop (KYC), đăng bán sản phẩm, quản lý kho hàng, xử lý fulfillment đơn hàng, đối soát doanh thu & yêu cầu rút tiền (Payout). |
| **Shipper Portal** | `/(shipper)/shipper/*` | Kênh điều phối giao hàng: Tiếp nhận kiện hàng, cập nhật lộ trình giao vận, chụp ảnh xác nhận Proof-of-Delivery, đối soát tiền thu hộ COD. |
| **Admin Panel** | `/(admin)/admin/*` | Ban quản trị sàn: Kiểm duyệt người bán, quản lý danh mục/sản phẩm, theo dõi đơn hàng toàn sàn, đối soát tài chính, giám sát Outbox Worker, Dead-letter Queue và Audit Log. |

---

## ⭐ Các Tính năng Nổi bật

### 1. Trải nghiệm Khách hàng (Customer Experience)
- **Giao diện hiện đại, Dynamic 3D:** Tích hợp mô hình Three.js 3D xoay giày đá bóng tương tác, micro-animations, theme thể thao tối ưu.
- **Duyệt hàng & Lọc thông minh:** Lọc theo thương hiệu (Nike, Adidas, Puma, Mizuno...), phân loại mặt sân (TF - cỏ nhân tạo, FG - cỏ tự nhiên, IC - futsal), size giày, mức giá.
- **Giỏ hàng & Flash Sale:** Đếm ngược flash sale realtime, áp mã giảm giá sàn & voucher shop, tính toán chiết khấu tự động.
- **Cổng thanh toán tự động VietQR (PayOS):** Tạo mã QR Napas 247 động theo đơn hàng, tự động xác nhận thanh toán qua Webhook IPN trong 1-3 giây.
- **Ví điện tử nội bộ:** Hỗ trợ nạp tiền, thanh toán bằng số dư ví, hoàn tiền tức thì khi hủy đơn.

### 2. Nghiệp vụ Kho vận & Toàn vẹn Dữ liệu (Inventory & Concurrency)
- **Dự trữ tồn kho có thời hạn (Inventory Reservation):** Khóa tồn kho 15 phút khi tạo đơn để tránh race condition bán quá số lượng (overselling). Nếu khách không thanh toán, worker tự động hoàn trả tồn kho về trạng thái bán.
- **Máy trạng thái đơn hàng (Order State Machine):** Chuyển đổi trạng thái đơn nghiêm ngặt kèm kiểm tra actor quyền hạn (`PENDING` ➔ `CONFIRMED` ➔ `PACKING` ➔ `SHIPPING` ➔ `DELIVERED` ➔ `COMPLETED`). Sử dụng cơ chế khóa lạc quan `statusVersion` chống ghi đè trạng thái đồng thời.
- **Tách Fulfillment đa nhà bán:** Đơn hàng có sản phẩm từ nhiều shop được tự động phân tách thành các `SellerFulfillment` riêng biệt để các shop xử lý độc lập.

### 3. Toàn vẹn Tài chính & Kế toán (Financial Integrity)
- **Sổ cái kế toán kép (Double-Entry Ledger):** Bảng `WalletLedger` ghi nhận biến động số dư bất biến (immutable), đối soát chính xác `balanceBefore` + `amount` = `balanceAfter`.
- **Kiểu dữ liệu tiền tệ chính xác:** Toàn bộ giá trị tài chính sử dụng `Decimal(19,4)` qua thư viện `Decimal.js` (không dùng số thực float JavaScript).
- **Cơ chế Idempotency chống trừ trùng tiền:** Bảng `IdempotencyRecord` chặn xử lý trùng lặp đối với cả request checkout, webhook thanh toán và yêu cầu rút tiền.

### 4. Xử lý Bất đồng bộ (Transactional Outbox Pattern)
- Mọi sự kiện nghiệp vụ (gửi email, trừ điểm, cập nhật thống kê) được ghi vào bảng `OutboxEvent` trong cùng database transaction với dữ liệu chính.
- Worker chuyên trách quét outbox, xử lý với cơ chế thuê sự kiện (`lease`), retry có backoff và chuyển vào Dead-Letter Queue khi quá số lần thử.

### 5. An ninh & Bảo mật Đa lớp (Multi-layer Security)
- **Xác thực an toàn:** JWT Access Token (15 phút) & Refresh Token rotation lưu trong HTTP-Only cookie, chống tấn công XSS.
- **Bảo mật 2 lớp (2FA TOTP):** Hỗ trợ Google Authenticator/Authy qua thư viện `speakeasy`.
- **Mã PIN thanh toán độc lập (Payment PIN):** Yêu cầu nhập PIN khi rút tiền hoặc dùng ví.
- **Kiểm soát Mutation (Origin Policy):** Chặn các request API mutation không xuất phát từ origin được phép (chống CSRF).
- **Rate Limiting lưu Database:** Kiểm soát brute-force theo IP và endpoint, hỗ trợ proxy headers (`TRUST_PROXY`).
- **Kiểm tra File Upload an toàn:** Xác thực Magic bytes của file ảnh trước khi đẩy lên Cloudinary; giới hạn dung lượng và quota upload theo ngày.
- **Công tắc bảo trì khẩn cấp (Kill Switch):** Cấu hình `MAINTENANCE_MODE=true` ngắt ngay lưu lượng truy cập công khai khi gặp sự cố, giữ nguyên quyền truy cập Admin và Health check.

---

## 🛠️ Công nghệ Cốt lõi

| Lớp | Công nghệ | Chi tiết |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router) | React 19, Turbopack, Server Actions, Route Handlers |
| **Ngôn ngữ** | TypeScript 5 | Strict mode, End-to-end type safety |
| **Cơ sở dữ liệu** | PostgreSQL 16 (Supabase) | Supavisor pooler (port 6543) cho runtime, Direct (port 5432) cho DDL migration |
| **ORM** | Prisma 5.22 | Schema-driven modeling, migrations, client generation |
| **Xác thực** | `jose`, `bcryptjs`, `speakeasy` | JWT HttpOnly cookie, PBKDF2/bcrypt hashing, TOTP 2FA |
| **Quản trị State** | Zustand | Lightweight client store (Cart, User session) |
| **Giao diện & 3D** | Tailwind CSS, Three.js, Lucide Icons | Responsive UI, interactive 3D shoe viewer |
| **Lưu trữ ảnh** | Cloudinary | Upload ảnh sản phẩm, KYC người bán |
| **Cổng thanh toán** | PayOS SDK (`@payos/node`), VNPay | VietQR Napas 247, VNPay gateway |
| **Email thông báo** | Resend API | Gửi email kích hoạt, thông báo đơn hàng, hóa đơn |
| **Đo lường & SEO** | GA4, Meta Pixel, JSON-LD Schema | Phễu e-commerce tracking, OpenGraph, sitemap tự động |

---

## 💻 Yêu cầu Hệ thống

- **Node.js:** `>= 20.9.0` (Khuyến nghị **Node.js 22 LTS**).
- **Package Manager:** `npm` (phiên bản 10 hoặc 11).
- **Cơ sở dữ liệu:** PostgreSQL 16+ (Local Docker hoặc Supabase Cloud).

---

## 🚀 Cài đặt Môi trường Phát triển (Local Dev)

### 1. Clone repository & Cài đặt thư viện
```powershell
git clone <repository_url>
cd website_ban_hang
npm ci
```

### 2. Khởi tạo Cơ sở dữ liệu Local (Docker PostgreSQL)
Nếu bạn chưa có sẵn PostgreSQL, khởi chạy nhanh bằng Docker:
```powershell
docker run -d --name pg-dev -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=website_banhang -p 5432:5432 postgres:16
```

### 3. Cấu hình file môi trường `.env`
Sao chép từ `.env.example`:
```powershell
Copy-Item .env.example .env
```
Mở file `.env` và thiết lập các giá trị cơ bản:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/website_banhang?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/website_banhang?schema=public"

JWT_ACCESS_SECRET="it-must-be-a-random-string-at-least-32-chars-long"
JWT_REFRESH_SECRET="another-random-string-at-least-32-chars-long"

NEXT_PUBLIC_APP_URL="http://localhost:3000"
API_ALLOWED_ORIGINS="http://localhost:3000"

STORAGE_PROVIDER="local"
NOTIFICATION_PROVIDER="log"
```

### 4. Chạy Migration & Nạp dữ liệu mẫu
```powershell
# Chạy migration tạo bảng
npx prisma migrate dev

# Nạp dữ liệu cơ bản (Admin, Seller, Danh mục, 2.000 sản phẩm bóng đá mẫu)
npm run db:seed

# Khởi chạy server phát triển
npm run dev
```

Mở trình duyệt tại [http://localhost:3000](http://localhost:3000).

> ⚠️ **Lưu ý:** Lệnh `npm run db:seed` chỉ dùng cho môi trường **development/demo**, KHÔNG chạy trên database production vì lệnh này xóa và tạo lại dữ liệu mẫu.

---

## 🔑 Biến Môi trường (.env)

Xem chi tiết tất cả biến tại file [`.env.example`](file:///.env.example). Dưới đây là các nhóm biến quan trọng:

| Tên biến | Bắt buộc ở Prod | Mô tả |
| :--- | :---: | :--- |
| `DATABASE_URL` | **Có** | Chuỗi kết nối Postgres qua Connection Pooler Supabase (port 6543 kèm `?pgbouncer=true&connection_limit=1`). |
| `DIRECT_URL` | **Có** | Chuỗi kết nối trực tiếp (port 5432) dùng riêng cho `prisma migrate deploy`. |
| `JWT_ACCESS_SECRET` | **Có** | Chuỗi ngẫu nhiên tối thiểu 32 ký tự dùng ký access token. |
| `JWT_REFRESH_SECRET` | **Có** | Chuỗi ngẫu nhiên tối thiểu 32 ký tự dùng ký refresh token. |
| `REFRESH_TOKEN_TTL` | **Có** | Thời gian sống của refresh token tính bằng giây (ví dụ `604800` = 7 ngày). |
| `NEXT_PUBLIC_APP_URL` | **Có** | Domain chính thức của ứng dụng (bắt buộc giao thức **HTTPS** ở production). |
| `TRUST_PROXY` | **Có** | Bắt buộc `"true"` ở production khi đứng sau Vercel/Cloudflare/Nginx để rate limiter nhận đúng IP. |
| `CRON_SECRET` | **Có** | Secret ngẫu nhiên (>= 32 ký tự) bảo vệ các endpoint cron `/api/admin/cron/*`. |
| `WEBHOOK_SECRET` | **Có** | Secret ngẫu nhiên (>= 32 ký tự) xác thực webhook nội bộ/M2M. |
| `STORAGE_PROVIDER` | **Có** | Bắt buộc `"cloudinary"` ở production (môi trường prod từ chối `"local"` và `"s3"`). |
| `CLOUDINARY_*` | **Có** | Gồm `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. |
| `PAYOS_*` | Tùy chọn | `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` để nhận thanh toán VietQR thật. |
| `RESEND_API_KEY` | Tùy chọn | Khóa API Resend để gửi email đơn hàng, xác nhận OTP thực tế. |
| `MAINTENANCE_MODE` | Tùy chọn | Công tắc bảo trì (`"true"` / `"false"`). Khi `"true"`, middleware trả về 503 cho toàn bộ khách hàng. |
| `ENABLE_DEMO_WALLET` | Không | Phải để `"false"` hoặc không khai báo ở prod để chặn nạp tiền ảo. |

---

## 📜 Danh mục Lệnh Scripts & Vận hành

### 1. Kiểm tra Chất lượng Mã nguồn & Kiểm thử
```powershell
# Chạy static typecheck TypeScript
npm run typecheck

# Chạy kiểm tra quy chuẩn ESLint
npm run lint

# Chạy bộ tổng hợp kiểm tra (Typecheck + Money Static + Order State Audit)
npm test

# Kiểm tra tính hợp lệ của biến môi trường trước build
npm run preflight

# Build gói ứng dụng production
npm run build
```

### 2. Nghiệp vụ Database
```powershell
# Tạo và áp dụng migration mới (môi trường dev)
npm run db:migrate

# Áp dụng migration lên database production (dùng DIRECT_URL)
npm run db:deploy

# Nạp dữ liệu mẫu phát triển
npm run db:seed
```

### 3. Kiểm toán Nghiệp vụ & Vận hành (Audit & Maintenance)
```powershell
# Kiểm toán tĩnh logic tiền tệ (không dùng float, bắt buộc Decimal)
npm run money:static

# Kiểm toán quyền ghi trạng thái đơn hàng (chỉ OrderStateMachine được phép ghi)
npm run order-state:audit

# Đối soát toàn vẹn số dư ví & sổ cái Double-entry Ledger
npm run money:audit

# Quét và dọn dẹp các bản ghi Idempotency hết hạn
npm run idempotency:cleanup

# Dọn dẹp bộ đếm Rate limit lưu trong database
npm run security:cleanup

# Quét và nhả kho các đơn đặt hàng quá 15 phút chưa thanh toán
npm run inventory:expire

# Đối soát sai lệch tồn kho giữa Product và InventoryMovement
npm run inventory:reconcile

# Chạy Worker xử lý Outbox Event liên tục (chế độ daemon)
npm run outbox:worker

# Xử lý 1 batch Outbox Event rồi dừng (dành cho cron job)
npm run outbox:dispatch-once

# Đối soát và tự động phục hồi các Outbox Event bị treo
npm run outbox:reconcile
```

---

## 🚦 Đánh giá Sẵn sàng Go-Live (Go-Live Audit & Checklist)

### 📊 Kết quả Audit Codebase Hiện tại

| Hạng mục kiểm tra | Công cụ kiểm tra | Kết quả | Trạng thái |
| :--- | :--- | :---: | :---: |
| **Typecheck** | `tsc --noEmit` | 0 Lỗi | ✅ **PASSED** |
| **Linting** | `eslint src` | 0 Lỗi (84 warnings) | ✅ **PASSED** |
| **Money Static Audit** | `node scripts/audit/money-static.mjs` | 0 Vi phạm | ✅ **PASSED** |
| **Order State Audit** | `node scripts/audit/order-state-audit.mjs` | 1 writer duy nhất | ✅ **PASSED** |
| **Environment Preflight**| `tsx scripts/preflight.ts` | Hợp lệ | ✅ **PASSED** |
| **Production Build** | `next build` | 112 Pages OK | ✅ **PASSED** |

---

### ❓ Dự án Đã Go-Live Được Chưa?

> ### 🛑 **KẾT LUẬN: CODEBASE ĐÃ SẴN SÀNG, NHƯNG HẠ TẦNG VẬN HÀNH CẦN HOÀN TẤT CÁC BƯỚC TRƯỚC GIỜ G.**
> 
> Về mặt **mã nguồn, cấu trúc dữ liệu và logic nghiệp vụ**, dự án đã đạt chuẩn Production-Ready.  
> Tuy nhiên, **CHƯA THỂ MỞ PUBLIC CHO NGƯỜI DÙNG THỰC TẾ NGAY LẬP TỨC** cho đến khi hoàn thành **Checklist Hạ tầng & Vận hành** dưới đây:

### 📋 Checklist 5 Bước Bắt Buộc Trước Khi Mở Cổng Public:

#### 1. Cấu hình Biến Môi trường Production Thật
- [ ] Khởi tạo dự án Database trên **Supabase** (hoặc AWS RDS).
- [ ] Lấy chuỗi kết nối **Supavisor Pooler** (port 6543 kèm `?pgbouncer=true&connection_limit=1`) cho `DATABASE_URL`.
- [ ] Lấy chuỗi kết nối **Direct** (port 5432) cho `DIRECT_URL`.
- [ ] Sinh các secret ngẫu nhiên bảo mật cao bằng OpenSSL:
  - `JWT_ACCESS_SECRET` và `JWT_REFRESH_SECRET`: `openssl rand -base64 32`
  - `CRON_SECRET` và `WEBHOOK_SECRET`: `openssl rand -hex 32`
- [ ] Cấu hình storage `STORAGE_PROVIDER="cloudinary"` kèm thông tin `CLOUDINARY_*` thật.
- [ ] Cấu hình email `NOTIFICATION_PROVIDER="webhook"` hoặc `RESEND_API_KEY` thật.
- [ ] Đặt `NEXT_PUBLIC_APP_URL` sang domain chính thức dạng **HTTPS** (ví dụ `https://cunshop.vn`).
- [ ] Đảm bảo `TRUST_PROXY="true"` và `ENABLE_DEMO_WALLET="false"`.

#### 2. Áp dụng Migration lên Production Database
```bash
# Thực hiện deploy migration chính thức (sử dụng DIRECT_URL)
npx prisma migrate deploy
```

#### 3. Thiết lập Hạ tầng Background Worker & Cron Jobs
Lựa chọn 1 trong 2 giải pháp kiến trúc:
- **Giải pháp 1 (Vercel Pro + Vercel Cron):** Cấu hình cron gọi:
  - `* * * * *` ➔ `/api/admin/cron/outbox` (xử lý outbox gửi mail, push notify).
  - `* * * * *` ➔ `/api/admin/cron/inventory` (nhả hàng giữ chỗ sau 15 phút).
  - `*/5 * * * *` ➔ `/api/admin/cron/flash-sale` (kết thúc flash sale hết hạn).
  - `0 * * * *` ➔ `/api/admin/cron/maintenance` (dọn dẹp idempotency & security buckets).
  *(Lưu ý: Mọi request cron phải gửi kèm header `Authorization: Bearer <CRON_SECRET>`)*.
- **Giải pháp 2 (Docker Container riêng trên VM/VPS/Railway):**
  - Chạy tiến trình nền `npm run outbox:worker` liên tục 24/7.

#### 4. Dọn dẹp Dữ liệu Thử nghiệm (Data Cleansing)
- [ ] **BẢO TOÀN TUYỆT ĐỐI:** Bảng `SiteConfig`, bảng danh mục `Category` và 2.000 sản phẩm bóng đá `Product`.
- [ ] Xóa sạch dữ liệu giao dịch test: `Order`, `OrderItem`, `SellerFulfillment`, `WalletLedger`, `Payment`, `Refund`.
- [ ] Đặt lại số dư tất cả các ví `Wallet` về `0.00`.

#### 5. Kiểm thử Giao dịch Tiền Thật (End-to-End Smoke Test)
- [ ] Đặt một đơn hàng thật trị giá nhỏ (ví dụ 10.000 VNĐ) qua cổng VietQR PayOS.
- [ ] Quét mã QR bằng ứng dụng ngân hàng ➔ Tiền chuyển thành công.
- [ ] Xác nhận Webhook PayOS tự động cập nhật trạng thái đơn hàng sang `PAID` trong 1-3 giây.
- [ ] Kiểm tra Outbox Worker tự động bắn email xác nhận đơn và hóa đơn điện tử.
- [ ] Kiểm tra tồn kho của sản phẩm bị trừ chính xác; bảng `WalletLedger` ghi nhận biến động khớp số dư.
- [ ] Thực hiện quy trình hủy đơn / hoàn tiền và đối soát.

---

## 📁 Cấu trúc Thư mục Codebase

```text
website_ban_hang/
├── .github/workflows/          # CI/CD pipeline (Typecheck, Lint, Audit, Build)
├── docs/                       # Tài liệu kiến trúc, nghiệp vụ & runbooks
│   ├── architecture.md         # Tổng quan kiến trúc hệ thống
│   ├── ORDER_STATE_MACHINE.md  # Quy định máy trạng thái đơn hàng & actor
│   ├── money-and-currency.md   # Chuẩn mực tiền tệ Decimal & Double-entry Ledger
│   ├── outbox-runbook.md       # Sổ tay vận hành Outbox Pattern Worker
│   ├── idempotency-runbook.md  # Cơ chế kiểm soát trùng lặp Idempotency
│   ├── backup-restore-runbook  # Sổ tay sao lưu & phục hồi dữ liệu
│   ├── production-checklist.md # Danh mục kiểm tra hạ tầng production
│   └── security.md             # Chính sách an toàn & phân quyền
├── prisma/
│   ├── schema.prisma           # Schema định nghĩa ~40 models & enums
│   ├── seed.ts                 # Script seed dữ liệu cơ sở cho dev
│   └── seed-products.ts        # Script import danh mục 2.000 sản phẩm giày
├── public/                     # Static assets, logos, placeholder images
├── scripts/
│   ├── audit/                  # Scripts kiểm toán tĩnh money & order-state
│   ├── maintenance/            # Scripts bảo trì (inventory, outbox, idempotency)
│   ├── workers/                # Outbox dispatcher worker daemon
│   ├── preflight.ts            # Kiểm tra biến môi trường production trước build
│   └── smoke-prod.sh           # Script smoke test tự động trên server production
├── src/
│   ├── app/                    # Next.js 16 App Router (Routes & Route Handlers)
│   │   ├── (admin)/            # Giao diện & chức năng Quản trị sàn (Admin)
│   │   ├── (auth)/             # Giao diện Đăng nhập, Đăng ký, 2FA, Quên mật khẩu
│   │   ├── (seller)/           # Kênh Người bán (Seller Center)
│   │   ├── (shipper)/          # Cổng Vận chuyển & Giao hàng (Shipper Portal)
│   │   ├── (shop)/             # Giao diện Khách hàng (Storefront)
│   │   ├── api/                # API Route Handlers (RESTful endpoints)
│   │   │   ├── admin/          # API Quản trị & Cron jobs
│   │   │   ├── auth/           # API Xác thực, Session, 2FA, OAuth
│   │   │   ├── payments/       # API Cổng thanh toán & Webhook IPN
│   │   │   └── ...             # API Sản phẩm, Đơn hàng, Voucher, Ví
│   ├── components/             # React UI Components
│   │   ├── admin/              # Components dành cho Admin Panel
│   │   ├── common/             # Header, Footer, Navbar, Modal dùng chung
│   │   ├── home/               # Components trang chủ (Hero3D, FlashSale, USP...)
│   │   ├── product/            # Card sản phẩm, bộ lọc, chi tiết giày
│   │   └── seller/             # Bảng biểu, form quản lý người bán
│   ├── config/                 # Cấu hình biến môi trường với Zod validation
│   ├── hooks/                  # Custom React Hooks
│   ├── lib/
│   │   ├── db.ts               # Prisma Client singleton
│   │   ├── rate-limit/         # Rate limiting engine
│   │   ├── security/           # Mutation origin guards, cron guards
│   │   └── services/           # Business logic layer (Order, Payment, Inventory...)
│   ├── middleware.ts           # Middleware bảo vệ route, check maintenance mode
│   └── store/                  # Zustand state stores (Cart, Auth...)
├── master_plan_go_live_mtruong_store.md # Kế hoạch tổng thể Go-Live 4 tuần
├── PHASE5_RUNBOOK.md           # Sổ tay thao tác thủ công trước giờ G
├── package.json
└── tsconfig.json
```

---

## 📚 Tài liệu Nghiệp vụ & Runbooks

- [Kế hoạch Tổng thể Go-Live (Master Plan)](file:///master_plan_go_live_mtruong_store.md)
- [Sổ tay Thao tác Thủ công Trước Giờ G (Phase 5 Runbook)](file:///PHASE5_RUNBOOK.md)
- [Quy định Máy trạng thái Đơn hàng (Order State Machine)](file:///docs/ORDER_STATE_MACHINE.md)
- [Chuẩn mực Tiền tệ & Kế toán Sổ cái Kép (Money & Ledger)](file:///docs/money-and-currency.md)
- [Sổ tay Vận hành Outbox Worker (Outbox Runbook)](file:///docs/outbox-runbook.md)
- [Sổ tay Xử lý Idempotency & Webhooks](file:///docs/idempotency-runbook.md)
- [Quy trình Sao lưu & Phục hồi Cơ sở dữ liệu (Backup & Restore)](file:///docs/backup-restore-runbook.md)
- [Checklist Môi trường Production](file:///docs/production-checklist.md)
- [Chính sách Bảo mật & Phòng thủ](file:///docs/security.md)

---

## 📄 License

Dự án phát hành theo giấy phép [MIT License](LICENSE).
