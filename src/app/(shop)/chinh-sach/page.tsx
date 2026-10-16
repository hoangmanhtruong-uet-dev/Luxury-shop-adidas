import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Chính Sách',
  description: 'Chính sách mua hàng, đổi trả, bảo hành, vận chuyển và bảo mật thông tin tại Cún-shop.',
};

const POLICIES = [
  {
    id: 'doi-tra',
    emoji: '🔄',
    title: 'Chính Sách Đổi Trả 7 Ngày',
    color: 'from-emerald-600 to-teal-600',
    badge: '7 NGÀY ĐỔI TRẢ',
    sections: [
      {
        heading: 'Điều kiện áp dụng',
        content: [
          'Sản phẩm còn nguyên seal, chưa kích hoạt, không có dấu hiệu sử dụng.',
          'Còn đủ phụ kiện, hộp, tài liệu kèm theo ban đầu.',
          'Có hoá đơn mua hàng hoặc mã đơn hàng từ Cún-shop.',
          'Thời gian yêu cầu đổi trả trong vòng 7 ngày kể từ ngày nhận hàng.',
        ],
      },
      {
        heading: 'Các trường hợp được đổi/trả',
        content: [
          'Sản phẩm bị lỗi kỹ thuật do nhà sản xuất (không phải do người dùng).',
          'Sản phẩm giao sai mẫu, sai màu sắc, sai kích cỡ so với đơn đặt.',
          'Sản phẩm bị hư hỏng trong quá trình vận chuyển (có bằng chứng quay video lúc nhận).',
        ],
      },
      {
        heading: 'Quy trình đổi trả',
        content: [
          'Bước 1: Liên hệ Hotline 0968 544 769 hoặc email support@cun-shop.vn.',
          'Bước 2: Cung cấp mã đơn hàng, hình ảnh/video sản phẩm lỗi.',
          'Bước 3: Nhân viên xác nhận và cấp phiếu đổi trả trong vòng 24 giờ.',
          'Bước 4: Gửi sản phẩm về địa chỉ kho hàng (Cún-shop thanh toán phí ship chiều về).',
          'Bước 5: Hoàn tiền hoặc gửi hàng đổi trong vòng 3-5 ngày làm việc.',
        ],
      },
    ],
  },
  {
    id: 'bao-hanh',
    emoji: '🛡️',
    title: 'Chính Sách Bảo Hành Chính Hãng',
    color: 'from-blue-600 to-indigo-600',
    badge: 'BẢO HÀNH KEO – CHỈ 6 THÁNG',
    sections: [
      {
        heading: 'Thời gian bảo hành',
        content: [
          'Giày đá bóng chính hãng (Nike, Adidas, Mizuno, Puma...): bảo hành keo – chỉ 6 tháng, đổi size miễn phí trong 30 ngày.',
          'Hỗ trợ kiểm tra hàng chính hãng (check auth) trọn đời — phát hiện hàng fake đền 200% giá trị đơn hàng.',
          'Phụ kiện bóng đá (bóng, tất, bó gối, găng thủ môn): bảo hành 7 ngày đổi trả với sản phẩm lỗi kỹ thuật.',
        ],
      },
      {
        heading: 'Trung tâm bảo hành ủy quyền',
        content: [
          'Hà Nội: Tòa nhà Keangnam Landmark, 72 Phạm Hùng, Cầu Giấy.',
          'TP.HCM: Tòa nhà Bitexco Financial Tower, 2 Hải Triều, Quận 1.',
          'Hotline bảo hành: 0968 544 769 (miễn phí, 24/7).',
          'Đăng ký bảo hành điện tử qua App Cún-shop.',
        ],
      },
      {
        heading: 'Điều kiện bảo hành',
        content: [
          'Sản phẩm còn trong thời hạn bảo hành, chưa hết hạn tem niêm phong.',
          'Không có dấu hiệu va đập, tiếp xúc nước, hoặc can thiệp bởi đơn vị sửa chữa ngoài.',
          'Có phiếu bảo hành hoặc hóa đơn mua hàng từ Cún-shop.',
        ],
      },
    ],
  },
  {
    id: 'van-chuyen',
    emoji: '🚚',
    title: 'Chính Sách Vận Chuyển',
    color: 'from-orange-600 to-amber-600',
    badge: 'GIAO SIÊU TỐC 2H',
    sections: [
      {
        heading: 'Phí vận chuyển',
        content: [
          'Miễn phí giao hàng toàn quốc cho đơn hàng từ 500.000 ₫.',
          'Đơn hàng dưới 500.000 ₫: Phí ship 25.000 – 45.000 ₫ tùy khu vực.',
          'Phí siêu tốc 2H nội thành TP.HCM & Hà Nội: 35.000 ₫ (miễn phí cho VIP Member).',
        ],
      },
      {
        heading: 'Thời gian giao hàng',
        content: [
          'Hỏa tốc 2H: Nội thành TP.HCM và Hà Nội (7:00 – 22:00 hàng ngày).',
          'Same-day: Đặt hàng trước 12:00 – giao trong ngày tại 63 tỉnh thành.',
          'Tiêu chuẩn: 1 – 3 ngày làm việc (tỉnh thành xa).',
          'Vùng sâu vùng xa: 3 – 7 ngày làm việc.',
        ],
      },
      {
        heading: 'Theo dõi đơn hàng',
        content: [
          'Tra cứu đơn hàng real-time tại trang "Đơn hàng của tôi" sau khi đăng nhập.',
          'Nhận thông báo SMS & Email khi đơn hàng được xác nhận, đóng gói, và giao.',
          'Hỗ trợ trực tiếp qua Hotline 0968 544 769 (24/7, miễn phí).',
        ],
      },
    ],
  },
  {
    id: 'bao-mat',
    emoji: '🔐',
    title: 'Chính Sách Bảo Mật Thông Tin',
    color: 'from-purple-600 to-rose-600',
    badge: 'SSL 256-BIT · PCI-DSS',
    sections: [
      {
        heading: 'Thông tin chúng tôi thu thập',
        content: [
          'Thông tin cá nhân: Họ tên, địa chỉ email, số điện thoại, địa chỉ giao hàng.',
          'Thông tin thanh toán: Được mã hóa chuẩn PCI-DSS Level 1, không lưu trữ số thẻ.',
          'Dữ liệu hành vi: Trang đã xem, sản phẩm đã thêm vào giỏ để cá nhân hoá trải nghiệm.',
        ],
      },
      {
        heading: 'Mục đích sử dụng',
        content: [
          'Xử lý đơn hàng và cung cấp dịch vụ mua sắm.',
          'Gửi thông báo khuyến mãi, Flash Sale, và ưu đãi đặc biệt (có thể hủy đăng ký bất cứ lúc nào).',
          'Cải thiện trải nghiệm sử dụng và cá nhân hóa gợi ý sản phẩm.',
          'Tuân thủ các yêu cầu pháp lý của cơ quan chức năng.',
        ],
      },
      {
        heading: 'Cam kết bảo mật',
        content: [
          'Mã hóa toàn bộ dữ liệu truyền tải bằng giao thức HTTPS/TLS 1.3.',
          'Không chia sẻ thông tin cá nhân với bên thứ ba ngoài mục đích xử lý đơn hàng.',
          'Người dùng có quyền yêu cầu xem, chỉnh sửa, hoặc xóa dữ liệu cá nhân.',
          'Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân tại Việt Nam.',
        ],
      },
    ],
  },
  {
    id: 'thanh-toan',
    emoji: '💳',
    title: 'Chính Sách Thanh Toán',
    color: 'from-pink-600 to-rose-600',
    badge: 'AN TOÀN 100%',
    sections: [
      {
        heading: 'Phương thức thanh toán được chấp nhận',
        content: [
          'Thẻ tín dụng/ghi nợ: Visa, Mastercard, JCB, American Express.',
          'Ví điện tử: MoMo, ZaloPay, VNPay, VietQR.',
          'Chuyển khoản ngân hàng: Hỗ trợ tất cả ngân hàng nội địa qua VietQR.',
          'Thanh toán khi nhận hàng (COD): Áp dụng cho đơn hàng dưới 10 triệu ₫.',
          'Trả góp 0%: Qua thẻ tín dụng các ngân hàng liên kết (kỳ hạn 3-24 tháng).',
        ],
      },
      {
        heading: 'Quy trình thanh toán an toàn',
        content: [
          'Tất cả giao dịch được mã hóa SSL 256-bit và xác thực PCI-DSS Level 1.',
          'Hỗ trợ xác thực 2 lớp (OTP qua SMS/Email) khi thanh toán thẻ.',
          'Không lưu trữ thông tin thẻ thanh toán trên hệ thống Cún-shop.',
        ],
      },
      {
        heading: 'Hoàn tiền',
        content: [
          'Hoàn tiền 100% trong vòng 5-7 ngày làm việc về nguồn thanh toán ban đầu.',
          'Giao dịch COD hoàn qua chuyển khoản ngân hàng trong vòng 2-3 ngày làm việc.',
          'Điểm thưởng tích lũy sẽ được trừ tương ứng khi hoàn tiền đơn hàng.',
        ],
      },
    ],
  },
];

export default function PolicyPage() {
  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 font-sans pb-16">
      
      {/* Hero Header */}
      <div className="border-b border-slate-800 bg-gradient-to-b from-[#0F172A] to-[#0B1120]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-wider mb-2">
            📋 TÀI LIỆU CHÍNH SÁCH
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            Chính Sách <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-500">Cún-shop</span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Cam kết minh bạch, rõ ràng và bảo vệ quyền lợi khách hàng trong mọi giao dịch. Cập nhật lần cuối: 01/03/2026.
          </p>

          {/* Quick Nav Pills */}
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            {POLICIES.map(p => (
              <a
                key={p.id}
                href={`#${p.id}`}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white rounded-full text-xs font-bold transition"
              >
                {p.emoji} {p.title.split(' Chính Sách ')[1] || p.title}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Policy Sections */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 space-y-16">
        {POLICIES.map((policy) => (
          <section key={policy.id} id={policy.id} className="scroll-mt-24 space-y-8">
            
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${policy.color} flex items-center justify-center text-3xl shadow-xl shrink-0`}>
                {policy.emoji}
              </div>
              <div>
                <span className={`inline-block text-[10px] font-black tracking-widest px-3 py-1 rounded-full bg-gradient-to-r ${policy.color} text-white uppercase mb-2`}>
                  {policy.badge}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white">{policy.title}</h2>
              </div>
            </div>

            {/* Sub-sections */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {policy.sections.map((sec, idx) => (
                <div key={idx} className="bg-[#1E293B] border border-slate-700/80 rounded-2xl p-6 space-y-4 shadow-lg hover:border-slate-600 transition">
                  <h3 className="text-sm font-bold text-white border-b border-slate-700 pb-3">
                    {sec.heading}
                  </h3>
                  <ul className="space-y-3">
                    {sec.content.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 mt-1.5"></span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* FAQ Quick Section */}
        <section id="faq" className="scroll-mt-24 space-y-8 pt-8 border-t border-slate-800">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-3xl shadow-xl shrink-0">
              ❓
            </div>
            <div>
              <span className="inline-block text-[10px] font-black tracking-widest px-3 py-1 rounded-full bg-slate-700 text-slate-300 uppercase mb-2">CÂU HỎI THƯỜNG GẶP</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">FAQ – Hỏi & Đáp</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { q: 'Tôi có thể hủy đơn hàng không?', a: 'Có, bạn có thể hủy đơn hàng trước khi đơn được đóng gói (thường trong vòng 1-2 giờ sau khi đặt). Sau khi hàng đóng gói, cần áp dụng chính sách đổi trả.' },
              { q: 'Sản phẩm có phải hàng chính hãng không?', a: 'Cún-shop cam kết 100% hàng chính hãng, có chứng nhận và xuất xứ rõ ràng. Hoàn tiền 200% nếu phát hiện hàng giả.' },
              { q: 'Thanh toán bị lỗi, tiền đã bị trừ?', a: 'Nếu giao dịch lỗi nhưng tiền đã bị trừ, ngân hàng sẽ tự động hoàn lại trong 1-5 ngày làm việc. Liên hệ Hotline 0968 544 769 để được hỗ trợ.' },
              { q: 'Làm thế nào để tích điểm thưởng?', a: 'Mỗi 100.000 ₫ chi tiêu = 1 điểm thưởng = 100 ₫ giảm giá cho lần mua tiếp theo. Điểm được cộng sau khi đơn hàng hoàn thành.' },
              { q: 'Có hỗ trợ xuất hóa đơn VAT không?', a: 'Có. Vui lòng ghi chú yêu cầu xuất hóa đơn VAT kèm mã số thuế khi đặt hàng. Hóa đơn sẽ được gửi qua email trong vòng 24 giờ sau khi giao hàng thành công.' },
              { q: 'Chính sách riêng tư của tôi có được bảo vệ?', a: 'Cún-shop cam kết không chia sẻ thông tin khách hàng với bên thứ ba. Dữ liệu được mã hóa SSL 256-bit và tuân thủ Nghị định 13/2023/NĐ-CP.' },
            ].map((faq, idx) => (
              <div key={idx} className="bg-[#1E293B] border border-slate-700 rounded-2xl p-6 space-y-3 hover:border-slate-600 transition">
                <h4 className="text-sm font-bold text-white flex items-start gap-2">
                  <span className="text-orange-400 shrink-0">Q.</span>
                  {faq.q}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed pl-5">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact CTA */}
        <section className="pt-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 via-rose-600 to-purple-700 p-8 md:p-12 text-center text-white space-y-5 shadow-2xl">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-sm rounded-3xl pointer-events-none"></div>
            <div className="relative z-10 space-y-4">
              <span className="text-3xl">🤝</span>
              <h2 className="text-2xl sm:text-3xl font-black">Bạn cần hỗ trợ thêm?</h2>
              <p className="text-white/90 text-sm max-w-lg mx-auto leading-relaxed">
                Đội ngũ CSKH Cún-shop sẵn sàng hỗ trợ bạn 24/7. Liên hệ ngay để được tư vấn miễn phí.
              </p>
              <div className="flex flex-wrap justify-center gap-4 pt-2">
                <a href="tel:0968544769" className="px-6 py-3 bg-white text-slate-900 font-black rounded-full text-sm hover:bg-amber-300 transition shadow-lg">
                  📞 Hotline 0968 544 769
                </a>
                <Link href="/products" className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-full text-sm transition backdrop-blur-md border border-white/30">
                  🛍️ Tiếp tục mua sắm
                </Link>
              </div>
            </div>
          </div>
        </section>

      </div>

    </div>
  );
}
