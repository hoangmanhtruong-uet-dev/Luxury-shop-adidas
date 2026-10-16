# Hướng dẫn Backup & Restore Database (PostgreSQL — Supabase)

Tài liệu này hướng dẫn cách backup và khôi phục cơ sở dữ liệu PostgreSQL trên Supabase production.
(Chuyển từ MySQL/Aiven ngày 2026-10-16 — bản MySQL cũ chỉ còn giá trị tham khảo.)

Ngoài các bước tay dưới đây, Supabase đã có **Daily Backup tự động** theo gói
(kiểm tra Project Settings → Database → Backups; PITR chỉ có ở gói Pro trở lên).
Phần dưới là lớp backup độc lập thứ hai, ra ngoài Supabase.

## 1. Tần suất backup đề xuất
- **Daily Backup**: Backup định kỳ mỗi ngày vào 02:00 AM (GMT+7).
- **Retention**: Lưu trữ các bản sao lưu trong 30 ngày gần nhất.
- **Lưu trữ**: Đẩy trực tiếp bản backup lên AWS S3 hoặc Storage an toàn bên ngoài
  (KHÔNG phải Supabase Storage của cùng project).

## 2. Quy trình Backup thủ công
Dùng `pg_dump` định dạng custom (nén + restore chọn lọc được):

```bash
# Đọc connection string từ biến môi trường, không paste password vào shell history
pg_dump "$DIRECT_URL" -Fc -f backup_$(date +%F_%H%M%S).dump
```

Lưu ý:
- Dùng `DIRECT_URL` (direct 5432), **không** backup qua pooler 6543.
- `-Fc` (custom format) cho phép restore 1 bảng (`-t ten_bang`) khi chỉ hỏng cục bộ.
- Không để password hiển thị rõ trong script chạy tự động (dùng environment variables / secret manager).

## 3. Quy trình Restore Database
```bash
# Restore toàn bộ vào database đích (TRỐNG hoặc đã clone dự phòng)
pg_restore -d "$DIRECT_URL_RESTORE_TARGET" --clean --if-exists backup_file.dump
```

*Lưu ý an toàn:*
- Luôn đảm bảo database đích đang trống hoặc đã được clone dự phòng trước khi restore (`--clean` drop object trước khi tạo lại).
- Sau restore: chạy `npm run money:audit` + `npm run order-state:audit` để khẳng định toàn vẹn tiền/đơn trước khi mở traffic.
- Chạy test restore định kỳ (Restore rehearsal) trên môi trường staging ít nhất mỗi quý một lần.
