# ARCHIVE — MySQL migrations (pre-Supabase)

21 migration trong thư mục này chạy trên **MySQL (Aiven)** và KHÔNG tương thích PostgreSQL
(`ENGINE=InnoDB`, backtick quoting, `ON DUPLICATE KEY UPDATE`, `utf8mb4`, hàm `IF()`…).

Ngày 2026-10-16 project chuyển sang **Supabase Postgres**:
- `prisma/migrations/` hiện chỉ chứa `00000000000000_postgres_baseline` (schema đầy đủ +
  toàn bộ CHECK constraint tiền tệ, đã port sang PG).
- Thư mục này giữ lại để tra cứu lịch sử (đặc biệt logic backfill `DECIMAL(19,4)` và
  các CHECK constraint đã port vào baseline). KHÔNG chạy lại, KHÔNG để Prisma đọc
  (Prisma chỉ đọc `prisma/migrations/`).
