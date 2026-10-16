import Link from 'next/link';

export const metadata = {
  title: 'Quy Trình Giải Quyết Khiếu Nại',
  description: 'Quy trình giải quyết tranh chấp giữa Người mua và Nhà bán hàng tại Sàn TMĐT Cún-shop.',
};

export default function DisputePage() {
  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8 bg-[#1E293B]/70 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl">
        <div className="border-b border-slate-800 pb-6">
          <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">TRUY XUẤT CÔNG BẰNG</span>
          <h1 className="text-3xl sm:text-4xl font-black text-white mt-2">Quy Trình Giải Quyết Tranh Chấp</h1>
          <p className="text-slate-400 text-xs mt-2">Cập nhật lần cuối: Ngày 30 tháng 09 năm 2026</p>
        </div>

        <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">1. Nguyên tắc giải quyết</h2>
            <p>
              Cún-shop tôn trọng và nỗ lực bảo vệ quyền lợi hợp pháp của cả Người mua lẫn Nhà bán hàng. Mọi tranh chấp phát sinh trong quá trình giao dịch đều được ưu tiên thương lượng, hòa giải công bằng dựa trên bằng chứng thực tế.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">2. Các bước gửi khiếu nại</h2>
            <ol className="list-decimal pl-5 space-y-2">
              <li><strong>Bước 1:</strong> Khách hàng tạo yêu cầu khiếu nại trực tiếp tại mục Chi tiết đơn hàng trong thời hạn 7 ngày kể từ khi nhận hàng.</li>
              <li><strong>Bước 2:</strong> Người bán có 48 giờ để phản hồi và đưa ra phương án xử lý (Đổi mới / Hoàn tiền / Bồi thường).</li>
              <li><strong>Bước 3:</strong> Nếu hai bên không đạt được thỏa thuận, Ban quản trị Cún-shop sẽ can thiệp thẩm định bằng chứng và ra phán quyết cuối cùng.</li>
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">3. Kênh tiếp nhận hỗ trợ khẩn cấp</h2>
            <p>
              Mọi thắc mắc hoặc phản ánh về hành vi gian lận xin vui lòng gửi về Hotline: <strong>0968 544 769</strong> hoặc Email: <strong>hotro@cun-shop.vn</strong>.
            </p>
          </section>
        </div>

        <div className="pt-6 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <Link href="/" className="hover:text-rose-400 font-bold transition">← Quay lại Trang chủ</Link>
          <span>Cún-shop Resolution Center</span>
        </div>
      </div>
    </div>
  );
}
