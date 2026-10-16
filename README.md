# Cún-shop

Nền tảng thương mại điện tử đa vai trò xây dựng với Next.js App Router, Prisma và MySQL. Dự án gồm storefront cho khách hàng, Seller Center, Admin Panel và luồng giao hàng cho shipper.

## Tính năng

- Khách hàng: duyệt sản phẩm/danh mục, giỏ hàng, checkout, đơn hàng, địa chỉ, hồ sơ, voucher và thông báo.
- Seller: đăng ký bán hàng, quản lý sản phẩm, tồn kho, đơn hàng/fulfillment, voucher, doanh thu và hồ sơ shop.
- Shipper: nhận và cập nhật đơn giao theo luồng fulfillment.
- Admin: quản lý người dùng, sản phẩm, đơn hàng, tồn kho, người bán, voucher, payout, audit và monitoring.
- Nghiệp vụ: tách fulfillment theo người bán; dự trữ tồn kho; money dùng `Decimal`; idempotency bền vững; state machine cho đơn/fulfillment; transactional outbox và audit log.
- Bảo mật: JWT access/refresh cookie, refresh-token rotation, RBAC, Zod validation, kiểm tra Origin cho API mutation, rate limit lưu DB, upload ảnh kiểm tra magic bytes và giới hạn quota.

## Công nghệ

| Thành phần | Công nghệ |
| --- | --- |
| Web/API | Next.js 16, React, TypeScript |
| Dữ liệu | PostgreSQL (Supabase production, local Docker), Prisma |
| Xác thực | `jose`, `bcryptjs`, HTTP-only cookies |
| Client state | Zustand |
| Styling | Tailwind CSS + CSS toàn cục |
| Ảnh | Cloudinary (production), local filesystem (development only) |

## Yêu cầu

- Node.js 22 hoặc mới hơn
- PostgreSQL 16+ (local: `docker run -d --name pg-dev -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=website_banhang -p 5432:5432 postgres:16`)
- npm

## Cài đặt nhanh

```powershell
npm ci
Copy-Item .env.example .env
```

Điền các giá trị bắt buộc trong `.env`, tối thiểu là `DATABASE_URL`, `JWT_ACCESS_SECRET` và `JWT_REFRESH_SECRET`. Hai secret JWT phải có ít nhất 32 ký tự. Đặt `NEXT_PUBLIC_APP_URL` và `API_ALLOWED_ORIGINS` đúng origin ứng dụng đang chạy.

Khởi tạo database cho môi trường phát triển:

```powershell
npx prisma migrate dev
npm run db:seed
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

> `npm run db:seed` xoá và tạo lại dữ liệu mẫu. Chỉ dùng cho database phát triển/demo, không chạy trên môi trường có dữ liệu thật.

## Tài khoản demo

Seed/demo không còn chứa mật khẩu mặc định trong mã nguồn. Chỉ chạy seed trên database phát triển/demo sau khi cấu hình rõ ràng các biến opt-in và secret placeholder riêng của môi trường, ví dụ `DEMO_ADMIN_PASSWORD=YOUR_DEMO_PASSWORD`. Không dùng tài khoản demo cho staging/production.

## Biến môi trường quan trọng

Sao chép `.env.example` để xem toàn bộ biến. Những nhóm cấu hình chính:

- `DATABASE_URL`: chuỗi kết nối PostgreSQL runtime (production: qua Supabase pooler 6543 + `?pgbouncer=true`); `DIRECT_URL`: direct connection cho migrate.
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`: xác thực và session.
- `NEXT_PUBLIC_APP_URL`, `API_ALLOWED_ORIGINS`, `TRUST_PROXY`: URL triển khai và chính sách origin/proxy.
- `STORAGE_PROVIDER`: `local` (chỉ dùng cho development) hoặc `cloudinary` (bắt buộc cho production). `s3` chưa được triển khai và bị từ chối ở production. Khi dùng Cloudinary, cung cấp `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- `WEBHOOK_SECRET`, `WEBHOOK_TOLERANCE_SECONDS`: xác thực webhook thanh toán bằng HMAC.
- `OUTBOX_*`: worker xử lý event và health/readiness.
- `NOTIFICATION_*`: mặc định `log`; dùng `webhook` chỉ với endpoint HTTPS đã allowlist.

Không commit `.env`, `.env.local` hoặc secret lên Git.

## Lệnh thường dùng

```powershell
# Chất lượng mã
npm run lint
npm run typecheck
npm test
npm run build

# Database
npm run db:migrate
npm run db:seed
npm run db:seed-products
npm run db:seed-vouchers

# Kiểm tra nghiệp vụ/vận hành
npm run money:static
npm run money:audit
npm run order-state:audit
npm run outbox:reconcile
npm run inventory:reconcile
npm run security:cleanup
```

Integration test yêu cầu Postgres test riêng và biến `TEST_DATABASE_URL`; tên database phải kết thúc bằng `_test` để script từ chối chạy nhầm database thật:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/mtruong_store_test?schema=public'
npm run test:integration
```

## Chạy production

```powershell
npm ci
npx prisma migrate deploy
npm run build
npm start
```

`npm start` chạy Next.js server cùng transactional-outbox worker. Dùng process supervisor/container orchestrator để quản lý tiến trình và cấu hình health check:

- `GET /api/health/live`: tiến trình đang hoạt động.
- `GET /api/health/ready`: database, heartbeat worker và dead-letter critical đều đạt yêu cầu.

Trước mỗi release, chạy:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

Xem thêm [Production checklist](PRODUCTION_CHECKLIST.md), [Security policy](SECURITY.md), [Testing guide](TESTING.md), [Architecture](ARCHITECTURE.md) và các runbook trong `docs/`.

## Lưu ý vận hành

- `STORAGE_PROVIDER=s3` chưa được triển khai và bị từ chối ở production. `STORAGE_PROVIDER=local` chỉ dùng cho development (dữ liệu sẽ mất khi container tái tạo). Dùng `STORAGE_PROVIDER=cloudinary` cho production.
- Provider thanh toán hiện là internal wallet; cần adapter provider thực, reconciliation và cấu hình webhook trước khi nhận thanh toán thật.
- `NOTIFICATION_PROVIDER=log` không gửi email/SMS. Cấu hình webhook notification hoặc tích hợp provider trước khi dùng reset password/notification với người dùng thật.
- Trong production phải dùng HTTPS, origin chính xác, secret ngẫu nhiên mạnh và tài khoản không phải demo.

## Cấu trúc chính

```text
src/app/                 Routes giao diện và API route handlers
src/lib/services/        Nghiệp vụ: auth, order, payment, inventory, outbox
src/lib/security/        Origin policy và mutation guards
src/components/          UI dùng chung và UI theo vai trò
prisma/                  Schema, migrations, seed
scripts/                 Worker, reconciliation và tác vụ vận hành
tests/                   Unit, integration và e2e tests
docs/                    Runbook và tài liệu nghiệp vụ
```

## License

MIT
