'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const adminMenu = [
  { label: 'Tổng quan hệ thống', icon: '📊', href: '/admin' },
  { label: 'Sửa ảnh', icon: '🖼️', href: '/admin/image-editor' },
  { label: 'Sản phẩm & Danh mục', icon: '📦', href: '/admin/products' },
  { label: 'Quản lý kho hàng', icon: '🏢', href: '/admin/inventory' },
  { label: 'Đơn hàng & Vận chuyển', icon: '🚚', href: '/admin/orders' },
  { label: 'Khách hàng & Phân quyền', icon: '👥', href: '/admin/users' },
  { label: 'Duyệt Seller & Payout', icon: '💳', href: '/admin/sellers' },
  { label: 'Marketing & Voucher', icon: '🎫', href: '/admin/marketing' },
  { label: 'Analytics kinh doanh', icon: '📈', href: '/admin/analytics' },
  { label: 'Monitoring', icon: '🖥️', href: '/admin/monitoring' },
  { label: 'Audit log', icon: '📜', href: '/admin/audit' },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[260px] bg-[#070D18] h-screen fixed inset-y-0 left-0 border-r border-[#152033] z-50 flex flex-col justify-between select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 pb-6 flex items-center gap-3 border-b border-[#131D2E]">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xl shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            🛡️
          </div>
          <div>
            <h1 className="text-white text-base font-bold leading-tight tracking-tight">Admin Portal</h1>
            <p className="text-xs text-slate-400 font-medium">Enterprise Core</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-100px)]">
          {adminMenu.map((item) => {
            const isActive = item.href === '/admin' 
              ? pathname === '/admin'
              : item.href !== '/' && pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13.5px] font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#15243B] text-white font-semibold shadow-inner border border-[#22385A]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#0E1726]'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-[#131D2E] text-[11px] text-slate-500 text-center">
        Cún Store © 2026 Admin
      </div>
    </aside>
  );
}
