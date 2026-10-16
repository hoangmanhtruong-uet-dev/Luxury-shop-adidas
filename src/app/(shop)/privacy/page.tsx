import Link from 'next/link';

export const metadata = {
  title: 'Chính Sách Bảo Mật Thông Tin',
  description: 'Chính sách bảo mật và bảo vệ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP tại Cún-shop.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8 bg-[#1E293B]/70 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl">
        <div className="border-b border-slate-800 pb-6">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">NGHỊ ĐỊNH 13/2023/NĐ-CP</span>
          <h1 className="text-3xl sm:text-4xl font-black text-white mt-2">Chính Sách Bảo Mật Dữ Liệu Cá Nhân</h1>
          <p className="text-slate-400 text-xs mt-2">Cập nhật lần cuối: Ngày 30 tháng 09 năm 2026</p>
        </div>

        <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">1. Mục đích thu thập dữ liệu</h2>
            <p>
              Cún-shop cam kết bảo vệ tuyệt đối thông tin cá nhân của khách hàng. Chúng tôi thu thập dữ liệu nhằm các mục đích:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Xử lý và hoàn tất đơn hàng, vận chuyển và đối soát thanh toán.</li>
              <li>Cung cấp dịch vụ chăm sóc khách hàng và giải quyết sự cố phát sinh.</li>
              <li>Cảnh báo bảo mật tài khoản (Đăng nhập 2FA, yêu cầu rút tiền).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">2. Phạm vi thông tin thu thập</h2>
            <p>
              Thông tin thu thập bao gồm: Họ tên, Số điện thoại, Email, Địa chỉ giao hàng, Lịch sử giao dịch đơn hàng và địa chỉ IP đăng nhập. Mọi thông tin nhạy cảm như Mật khẩu hay Mã PIN giao dịch đều được mã hóa bất biến (One-Way Hash).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">3. Cam kết không chia sẻ dữ liệu</h2>
            <p>
              Chúng tôi tuyệt đối không bán, chia sẻ hoặc tiết lộ dữ liệu cá nhân cho bên thứ ba vì mục đích thương mại, ngoại trừ các đơn vị đối tác phục vụ vận hành đơn hàng (Đối tác giao vận GHN/GHTK, Cổng thanh toán PayOS).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">4. Quyền của chủ thể dữ liệu</h2>
            <p>
              Khách hàng có quyền tra cứu, cập nhật, chỉnh sửa hoặc yêu cầu xóa bỏ tài khoản dữ liệu cá nhân của mình bất kỳ lúc nào bằng cách gửi yêu cầu tới Email: <strong>privacy@cun-shop.vn</strong>.
            </p>
          </section>
        </div>

        <div className="pt-6 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <Link href="/" className="hover:text-emerald-400 font-bold transition">← Quay lại Trang chủ</Link>
          <span>Cún-shop Privacy Shield</span>
        </div>
      </div>
    </div>
  );
}
