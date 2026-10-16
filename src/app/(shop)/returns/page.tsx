import Link from 'next/link';

export const metadata = {
  title: 'Chính Sách Đổi Trả & Hoàn Tiền',
  description: 'Chính sách kiểm hàng, đổi trả 1 đổi 1 trong 30 ngày và quy trình hoàn tiền tại Cún-shop.',
};

export default function ReturnsPage() {
  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8 bg-[#1E293B]/70 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl">
        <div className="border-b border-slate-800 pb-6">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">BẢO VỆ NGƯỜI MUA</span>
          <h1 className="text-3xl sm:text-4xl font-black text-white mt-2">Chính Sách Đổi Trả & Hoàn Tiền</h1>
          <p className="text-slate-400 text-xs mt-2">Cập nhật lần cuối: Ngày 30 tháng 09 năm 2026</p>
        </div>

        <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">1. Chính sách đồng kiểm (Kiểm hàng)</h2>
            <p>
              Cún-shop hỗ trợ chính sách <strong>Đồng kiểm trực tiếp</strong> khi nhận hàng. Khách hàng có quyền mở gói hàng kiểm tra ngoại quan (không bóc tem niêm phong niêm yết của nhà sản xuất) trước khi thanh toán cho nhân viên giao hàng.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">2. Điều kiện 1 đổi 1 trong 30 ngày</h2>
            <p>Sản phẩm được chấp nhận đổi mới 100% khi đáp ứng các điều kiện sau:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Sản phẩm phát sinh lỗi phần cứng do nhà sản xuất.</li>
              <li>Còn nguyên vẹn vỏ hộp, phụ kiện đi kèm và tem bảo hành.</li>
              <li>Có video quay lại quá trình mở hộp (Unboxing video) làm bằng chứng đối soát.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">3. Quy trình hoàn tiền (Refund Process)</h2>
            <p>
              Khi yêu cầu trả hàng/hoàn tiền được Người bán hoặc Ban quản trị Sàn duyệt, số tiền sẽ được tự động hoàn trực tiếp vào Ví tài khoản Cún-shop của bạn hoặc hoàn trả lại tài khoản ngân hàng gốc trong vòng <strong>1 đến 3 ngày làm việc</strong>.
            </p>
          </section>
        </div>

        <div className="pt-6 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <Link href="/" className="hover:text-amber-400 font-bold transition">← Quay lại Trang chủ</Link>
          <span>Cún-shop Guarantee</span>
        </div>
      </div>
    </div>
  );
}
