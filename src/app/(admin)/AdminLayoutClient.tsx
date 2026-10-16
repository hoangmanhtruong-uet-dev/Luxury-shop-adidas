'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import AdminSidebar from '@/components/admin/AdminSidebar';

/**
 * Phase 4.2: split out of `layout.tsx` so that file can be a Server Component
 * and export `metadata` (a `'use client'` module cannot export metadata).
 */
export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const { user, isLoading, fetchMe } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== 'admin') {
    return (
      <div className="bg-[#0B1120] min-h-screen flex items-center justify-center text-white text-sm">
        Đang xác thực quyền Admin...
      </div>
    );
  }

  return (
    <div className="bg-[#0B1120] min-h-screen text-slate-100 flex font-sans">
      {/* Fixed Left Sidebar */}
      <AdminSidebar />

      {/* Main Right Area */}
      <div className="flex-1 ml-[260px] flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="h-16 px-8 border-b border-[#131D2E] bg-[#0B1120]/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between">
          {/* Search Bar */}
          <div className="relative w-96">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search modules, users, transactions..."
              className="w-full pl-10 pr-4 py-2 bg-[#0F182A] border border-[#1C2C46] rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>

          {/* Right Profile & System Indicator */}
          <div className="flex items-center gap-5">
            {/* System Online Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              <span>System Online</span>
            </div>

            {/* Admin User Info */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-bold text-white leading-tight">Super Admin</div>
                <div className="text-[11px] text-slate-400">Operations</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-semibold text-sm">
                👤
              </div>
            </div>
          </div>
        </header>

        {/* Page Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}