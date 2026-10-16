'use client';

import { useState, useEffect } from 'react';
import { formatPrice } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 5,
    activeSellers: 3,
    totalProducts: 16,
    revenue: 166521306,
    totalOrders: 0,
  });

  const [recentUsers, setRecentUsers] = useState<any[]>([
    {
      id: '1',
      name: 'Cún Seller 01',
      email: 'seller01@cun-shop.store',
      role: 'user',
      isSeller: true,
      createdAt: new Date(Date.now() - 58 * 24 * 60 * 60 * 1000).toISOString(),
      avatarLetter: 'M',
      avatarBg: 'bg-amber-800/60 text-amber-300',
    },
    {
      id: '2',
      name: 'Hoàng Mạnh Trường',
      email: 'mtruongdayy@gmail.com',
      role: 'user',
      isSeller: true,
      createdAt: new Date(Date.now() - 129 * 24 * 60 * 60 * 1000).toISOString(),
      avatarLetter: 'H',
      avatarBg: 'bg-slate-800 text-slate-200',
    },
  ]);

  const [lastUpdatedTime, setLastUpdatedTime] = useState('Vừa xong');

  const fetchDashboardData = () => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setStats({
            totalUsers: data.totalUsers ?? 5,
            activeSellers: data.activeSellers ?? 3,
            totalProducts: data.totalProducts ?? 16,
            revenue: data.revenue ?? 166521306,
            totalOrders: data.totalOrders ?? 0,
          });
        }
      })
      .catch(console.error);

    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const formatted = data.slice(0, 5).map((u: any, idx: number) => ({
            ...u,
            avatarLetter: u.name ? u.name.charAt(0).toUpperCase() : 'U',
            avatarBg: idx % 2 === 0 ? 'bg-amber-800/60 text-amber-300' : 'bg-slate-800 text-slate-200',
          }));
          setRecentUsers(formatted);
        }
      })
      .catch(console.error);

    setLastUpdatedTime('Vừa xong');
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Hôm nay';
    return `${diffDays} ngày trước`;
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Thống Kê Hệ Thống</h1>
          <p className="text-sm text-slate-400 mt-1">Dữ liệu tổng hợp thời gian thực của toàn bộ nền tảng.</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-2 px-4 py-2 bg-[#10192A] border border-[#1E2E4A] hover:bg-[#16233B] text-slate-300 rounded-lg text-xs font-medium transition-colors"
          >
            <span>🔄</span>
            <span>Cập nhật mới nhất: {lastUpdatedTime}</span>
          </button>

          <button className="flex items-center gap-2 px-4 py-2 bg-[#EA580C] hover:bg-[#D97706] text-white rounded-lg text-xs font-semibold shadow-lg shadow-orange-950/20 transition-all">
            <span>📥</span>
            <span>Xuất Báo Cáo</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: TỔNG NGƯỜI DÙNG */}
        <div className="bg-[#0F1728] border border-[#192740] rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">TỔNG NGƯỜI DÙNG</span>
            <div className="w-8 h-8 rounded-lg bg-slate-800/80 flex items-center justify-center text-slate-300 text-sm">
              👥
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-white">{stats.totalUsers}</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold flex items-center gap-1 border border-emerald-500/20">
              📈 +12%
            </span>
          </div>
          {/* Accent Bottom Bar */}
          <div className="w-full bg-slate-800/60 h-1.5 rounded-full mt-5 overflow-hidden">
            <div className="bg-purple-500 h-full w-[40%] rounded-full" />
          </div>
        </div>

        {/* Metric 2: NGƯỜI BÁN HOẠT ĐỘNG */}
        <div className="bg-[#0F1728] border border-[#192740] rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">NGƯỜI BÁN HOẠT ĐỘNG</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400 text-sm">
              🏪
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-white">{stats.activeSellers}</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold flex items-center gap-1 border border-emerald-500/20">
              ✓ Active
            </span>
          </div>
          {/* Accent Bottom Bar */}
          <div className="w-full bg-slate-800/60 h-1.5 rounded-full mt-5 overflow-hidden">
            <div className="bg-emerald-500 h-full w-[65%] rounded-full" />
          </div>
        </div>

        {/* Metric 3: SẢN PHẨM TRÊN SÀN */}
        <div className="bg-[#0F1728] border border-[#192740] rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">SẢN PHẨM TRÊN SÀN</span>
            <div className="w-8 h-8 rounded-lg bg-amber-950/60 border border-amber-800/40 flex items-center justify-center text-amber-400 text-sm">
              📦
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-white">{stats.totalProducts}</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold flex items-center gap-1 border border-amber-500/20">
              🏷️ 4 danh mục
            </span>
          </div>
          {/* Accent Bottom Bar */}
          <div className="w-full bg-slate-800/60 h-1.5 rounded-full mt-5 overflow-hidden">
            <div className="bg-orange-500 h-full w-[50%] rounded-full" />
          </div>
        </div>

        {/* Metric 4: DOANH THU TOÀN HỆ THỐNG */}
        <div className="bg-[#0F1728] border border-[#192740] rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">DOANH THU TOÀN HỆ THỐNG</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400 text-sm">
              💳
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">{formatPrice(stats.revenue).replace('₫', '').trim()}</span>
            <span className="text-xs font-bold text-emerald-400">VND</span>
          </div>
          {/* Accent Bottom Bar */}
          <div className="w-full bg-slate-800/60 h-1.5 rounded-full mt-5 overflow-hidden">
            <div className="bg-teal-400 h-full w-[80%] rounded-full" />
          </div>
        </div>
      </div>

      {/* Main Grid: 2 Columns Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Người dùng mới gia nhập (2 cols width) */}
        <div className="lg:col-span-2 bg-[#0F1728] border border-[#192740] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-white">Người dùng mới gia nhập</h3>
                <p className="text-xs text-slate-400 mt-0.5">Danh sách các tài khoản vừa được đăng ký gần đây</p>
              </div>
              <button
                onClick={() => router.push('/admin/users')}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
              >
                <span>Xem tất cả</span>
                <span>➔</span>
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1A2942] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3">NGƯỜI DÙNG</th>
                    <th className="py-3 px-3">VAI TRÒ</th>
                    <th className="py-3 px-3">NGÀY THAM GIA</th>
                    <th className="py-3 px-3 text-right">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#15233B]">
                  {recentUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-[#131F35] transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                              u.avatarBg || 'bg-slate-800 text-slate-200'
                            }`}
                          >
                            {u.avatarLetter || u.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white">{u.name}</div>
                            <div className="text-xs text-slate-400">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase bg-amber-950/70 border border-amber-700/50 text-amber-300">
                          {u.isSeller ? 'SELLER' : u.role?.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-xs text-slate-300">
                        {formatRelativeTime(u.createdAt)}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => router.push(`/admin/users?id=${u.id}`)}
                          className="px-3 py-1.5 bg-[#142036] hover:bg-[#1C2D4B] text-slate-300 border border-[#223554] rounded-lg text-xs font-medium transition-colors"
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Cảnh báo hệ thống (1 col width) */}
        <div className="bg-[#0F1728] border border-[#192740] rounded-xl p-6 flex flex-col justify-between space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white">Cảnh báo hệ thống</h3>
            <p className="text-xs text-slate-400 mt-0.5">Giám sát trạng thái hạ tầng thời gian thực</p>
          </div>

          {/* Featured System Status Box */}
          <div className="bg-[#09101C] border border-[#16243D] rounded-xl p-6 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-2xl shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              🛡️
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Hệ thống ổn định</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-[240px] mx-auto leading-relaxed">
                Không có cảnh báo mới hoặc sự cố cần xử lý lúc này.
              </p>
            </div>

            {/* Sub stats */}
            <div className="flex items-center justify-center gap-6 pt-3 border-t border-[#142036] text-xs text-slate-400 font-medium">
              <div>
                <span className="text-slate-500">CPU Load:</span> <span className="text-slate-200 font-semibold">12%</span>
              </div>
              <div className="h-3 w-px bg-slate-800" />
              <div>
                <span className="text-slate-500">RAM:</span> <span className="text-slate-200 font-semibold">4.2GB / 16GB</span>
              </div>
            </div>
          </div>

          {/* Infrastructure Uptime Metrics */}
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 px-3 bg-[#0B1220] rounded-lg border border-[#152238] text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span className="font-semibold text-slate-200">API Gateway</span>
              </div>
              <span className="font-bold text-emerald-400">99.98% Uptime</span>
            </div>

            <div className="flex items-center justify-between py-2 px-3 bg-[#0B1220] rounded-lg border border-[#152238] text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span className="font-semibold text-slate-200">Database Cluster</span>
              </div>
              <span className="font-bold text-emerald-400">Optimal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
