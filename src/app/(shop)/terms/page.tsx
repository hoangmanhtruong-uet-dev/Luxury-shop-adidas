import Link from 'next/link';

export const metadata = {
  title: 'Điều Khoản Sử Dụng Dịch Vụ',
  description: 'Quy chế hoạt động và điều khoản sử dụng sàn thương mại điện tử đa nhà bán Cún-shop.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8 bg-[#1E293B]/70 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl">
        <div className="border-b border-slate-800 pb-6">
          <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">VĂN BẢN PHÁP LÝ</span>
          <h1 className="text-3xl sm:text-4xl font-black text-white mt-2">Điều Khoản Sử Dụng Dịch Vụ</h1>
          <p className="text-slate-400 text-xs mt-2">Cập nhật lần cuối: Ngày 30 tháng 09 năm 2026</p>
        </div>

        <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">1. Giới thiệu chung</h2>
            <p>
              Chào mừng bạn đến với <strong>Cún-shop</strong> — Sàn thương mại điện tử đa nhà bán hàng thuộc quyền sở hữu và vận hành hợp pháp bởi Công ty TNHH Cún-shop. Khi truy cập và mua sắm trên hệ thống, bạn đồng ý tuân thủ toàn bộ các điều khoản và điều kiện quy định tại đây.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">2. Quyền và nghĩa vụ của Người mua</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Cung cấp chính xác thông tin giao hàng (Họ tên, Số điện thoại, Địa chỉ nhận hàng).</li>
              <li>Thanh toán đầy đủ tiền hàng theo hình thức đã lựa chọn (COD, PayOS VietQR, Ví điện tử).</li>
              <li>Kiểm tra tình trạng nguyên seal, niêm phong của đơn hàng trước khi thanh toán cho đơn vị giao vận.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">3. Quyền và nghĩa vụ của Người bán (Seller)</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Cung cấp đầy đủ hồ sơ xác minh danh tính (KYC) và giấy phép kinh doanh hợp lệ.</li>
              <li>Cam kết 100% sản phẩm đăng bán là hàng chính hãng, không vi phạm sở hữu trí tuệ hoặc hàng cấm.</li>
              <li>Đóng gói hàng hóa đúng quy chuẩn và bàn giao đúng hạn cho bên vận chuyển.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">4. Thanh toán & Đối soát an toàn</h2>
            <p>
              Cún-shop áp dụng cơ chế thanh toán tạm giữ và đối soát tự động qua cổng thanh toán PayOS. Tiền thanh toán của Người mua sẽ được tạm giữ an toàn cho đến khi đơn hàng giao thành công và hết thời hạn khiếu nại.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">5. Sở hữu trí tuệ</h2>
            <p>
              Mọi bản quyền thương hiệu, logo, giao diện thiết kế, mã nguồn phần mềm và nội dung đăng tải trên Cún-shop đều thuộc tài sản độc quyền của chúng tôi. Nghiêm cấm mọi hành vi sao chép khi chưa có sự chấp thuận bằng văn bản.
            </p>
          </section>
        </div>

        <div className="pt-6 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <Link href="/" className="hover:text-orange-400 font-bold transition">← Quay lại Trang chủ</Link>
          <span>Cún-shop Legal Center</span>
        </div>
      </div>
    </div>
  );
}
