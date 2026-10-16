'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { FiTruck, FiRefreshCw, FiShield, FiHeadphones, FiMapPin, FiPhone, FiMail, FiDownloadCloud } from 'react-icons/fi';

export default function Footer() {
  const pathname = usePathname();
  
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/seller') || pathname?.startsWith('/shipper')) return null;

  return (
    <footer className="bg-[#080d1a] text-slate-400 font-sans border-t border-[#1f2937]">
      {/* Feature Highlights */}
      <div className="border-b border-[#1f2937]">
        <div className="max-w-7xl mx-auto px-8 py-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#1E293B] flex items-center justify-center text-slate-300">
              <FiTruck size={24} />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">Miễn phí vận chuyển</h4>
              <p className="text-xs mt-1 leading-relaxed">Áp dụng đơn hàng toàn quốc từ 500k, giao siêu tốc nội thành 2h</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#1E293B] flex items-center justify-center text-slate-300">
              <FiRefreshCw size={24} />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">7 Ngày đổi trả miễn phí</h4>
              <p className="text-xs mt-1 leading-relaxed">Cam kết hoàn tiền 100% nếu phát hiện lỗi từ nhà sản xuất</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#1E293B] flex items-center justify-center text-slate-300">
              <FiShield size={24} />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">100% Hàng chính hãng</h4>
              <p className="text-xs mt-1 leading-relaxed">Chứng nhận & xuất xứ rõ ràng, bảo hành từ 12-24 tháng</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#1E293B] flex items-center justify-center text-slate-300">
              <FiHeadphones size={24} />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">Hỗ trợ chuyên nghiệp 24/7</h4>
              <p className="text-xs mt-1 leading-relaxed">Đội ngũ tư vấn chọn size tận tình qua Hotline 0968 544 769</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-8 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <Link href="/" className="flex items-center gap-2 mb-4">
            <span className="text-2xl">💎</span>
            <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-500 tracking-tight">Cún-shop</span>
          </Link>
          <p className="text-xs leading-relaxed mb-6">
            Shop giày đá bóng chính hãng — Nike, Adidas, Mizuno, Puma. Uy tín, chất lượng, đổi size 30 ngày. 
            Khẳng định phong cách sống hiện đại và chuẩn mực.
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-1 rounded">
              <FiShield size={12} /> BỘ CÔNG THƯƠNG
            </div>
            <div className="flex items-center gap-1.5 border border-slate-700 bg-slate-800 text-slate-300 text-[10px] px-2 py-1 rounded">
              <FiShield size={12} /> SSL 256-BIT
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Danh mục</h4>
          <ul className="space-y-3">
            {[
              { label: 'Giày sân cỏ tự nhiên', href: '/products?category=Giày+sân+cỏ+tự+nhiên' },
              { label: 'Giày sân cỏ nhân tạo', href: '/products?category=Giày+sân+cỏ+nhân+tạo' },
              { label: 'Giày futsal', href: '/products?category=Giày+futsal' },
              { label: 'Phụ kiện bóng đá', href: '/products?category=Phụ+kiện+bóng+đá' },
              { label: 'Hàng chính hãng', href: '/products' },
              { label: 'Khuyến mãi hôm nay', href: '/products?sale=true' },
            ].map(item => (
              <li key={item.label}>
                <Link href={item.href} className="text-xs hover:text-orange-500 transition">{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Hỗ trợ & Pháp lý</h4>
          <ul className="space-y-3">
            {[
              { label: 'Điều khoản sử dụng dịch vụ', href: '/terms' },
              { label: 'Chính sách bảo mật (NĐ 13/2023)', href: '/privacy' },
              { label: 'Chính sách đổi trả & hoàn tiền', href: '/returns' },
              { label: 'Quy trình giải quyết khiếu nại', href: '/dispute' },
              { label: 'Hướng dẫn thanh toán VietQR PayOS', href: '/terms' },
            ].map(item => (
              <li key={item.label}>
                <Link href={item.href} className="text-xs hover:text-orange-500 transition">{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Liên hệ & Bảo hành</h4>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <FiMapPin className="text-orange-500 shrink-0 mt-0.5" />
              <span className="text-xs leading-relaxed">Trung tâm Trải nghiệm: Tòa nhà Bitexco, Quận 1, TP. Hồ Chí Minh</span>
            </li>
            <li className="flex items-center gap-3">
              <FiPhone className="text-orange-500 shrink-0" />
              <span className="text-xs">Hotline hỗ trợ: <strong className="text-white">0968 544 769</strong> (24/7)</span>
            </li>
            <li className="flex items-center gap-3">
              <FiMail className="text-orange-500 shrink-0" />
              <span className="text-xs">support@cun-shop.vn</span>
            </li>
            <li className="flex items-center gap-3">
              <FiDownloadCloud className="text-orange-500 shrink-0" />
              <span className="text-xs hover:text-orange-500 cursor-pointer transition">Bảo hành điện tử qua App / Hotline</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[#1f2937] py-6">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px]">
          <p>© 2026 Cún-shop. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-[#1E293B] rounded text-[#38bdf8] font-black tracking-wider">PayOS (VietQR)</span>
            <span className="px-2 py-1 bg-[#1E293B] rounded text-slate-300 font-bold tracking-wider">VISA</span>
            <span className="px-2 py-1 bg-[#1E293B] rounded text-slate-300 font-bold tracking-wider">MASTERCARD</span>
            <span className="px-2 py-1 bg-[#1E293B] rounded text-slate-300 font-bold tracking-wider">MOMO</span>
          </div>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-white transition">Điều khoản sử dụng</Link>
            <Link href="/privacy" className="hover:text-white transition">Chính sách bảo mật</Link>
            <Link href="/returns" className="hover:text-white transition">Đổi trả & Hoàn tiền</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
