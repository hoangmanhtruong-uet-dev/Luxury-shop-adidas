'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FcGoogle } from 'react-icons/fc';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/components/ui/Toast';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'user' | 'admin' | 'shipper'>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore(s => s.login);
  const addToast = useToastStore(s => s.addToast);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('from');
  const registerHref = redirectTo ? '/register?from=' + encodeURIComponent(redirectTo) : '/register';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let code: string | undefined;
    let loginResult = await login(email, password);

    if (loginResult.requires2FA) {
      const input = prompt('Tài khoản của bạn đã bật 2FA. Vui lòng nhập mã gồm 6 chữ số từ ứng dụng Authenticator:');
      if (!input) {
        setLoading(false);
        return;
      }
      code = input;
      loginResult = await login(email, password, code);
    }

    if (loginResult.ok) {
      const user = useAuthStore.getState().user;
      
      if (activeTab === 'admin' && (!user || user.role !== 'admin')) {
        setError('Tài khoản của bạn không có quyền Quản trị viên.');
        useAuthStore.getState().logout();
        setLoading(false);
        return;
      }
      if (activeTab === 'shipper' && (!user || user.role !== 'shipper')) {
        setError('Tài khoản của bạn không có quyền Giao hàng.');
        useAuthStore.getState().logout();
        setLoading(false);
        return;
      }

      const roleName = activeTab === 'admin' ? 'Quản trị viên' : activeTab === 'shipper' ? 'Người giao hàng' : 'Người dùng';
      addToast(`Đăng nhập thành công với tư cách ${roleName}! 🎉`);
      
      if (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
        router.push(redirectTo);
      } else if (activeTab === 'admin') {
        router.push('/admin');
      } else if (activeTab === 'shipper') {
        router.push('/shipper/orders');
      } else {
        router.push('/');
      }
      router.refresh();
    } else {
      setError(loginResult.error || 'Thông tin đăng nhập không chính xác');
    }
    setLoading(false);
  };

  return (
    <div className="page-container" style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'80vh', paddingTop:'40px' }}>
      <div style={{ width:'100%', maxWidth:'420px' }}>
        <div style={{ textAlign:'center', marginBottom:'40px' }}>
          <div style={{ 
            width: '80px', height: '80px', background: 'var(--accent-gradient)', 
            borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', fontSize: '40px', boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)'
          }}>
            {activeTab === 'admin' ? '🛡️' : activeTab === 'shipper' ? '🚚' : '🛍️'}
          </div>
          <h1 style={{ fontSize:'32px', fontWeight:800, marginBottom:'8px', letterSpacing:'-1px' }}>
            {activeTab === 'admin' ? 'Hệ thống Quản trị' : activeTab === 'shipper' ? 'Kênh Giao Hàng' : 'Chào mừng trở lại'}
          </h1>
          <p style={{ color:'var(--text-muted)', fontSize:'15px' }}>
            {activeTab === 'admin' ? 'Dành cho nhân viên và quản lý' : activeTab === 'shipper' ? 'Dành cho đối tác vận chuyển' : 'Đăng nhập để tiếp tục mua sắm'}
          </p>
        </div>

        {/* Tabs Selection */}
        <div style={{ 
          display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '6px', 
          borderRadius: '16px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <button 
            onClick={() => { setActiveTab('user'); setError(''); }}
            style={{ 
              flex: 1, padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer',
              background: activeTab === 'user' ? 'white' : 'transparent',
              color: activeTab === 'user' ? '#111' : 'white',
              fontWeight: 600, transition: 'all 0.3s ease',
              fontSize: '14px'
            }}>
            Người dùng
          </button>
          <button 
            onClick={() => { setActiveTab('shipper'); setError(''); }}
            style={{ 
              flex: 1, padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer',
              background: activeTab === 'shipper' ? 'white' : 'transparent',
              color: activeTab === 'shipper' ? '#111' : 'white',
              fontWeight: 600, transition: 'all 0.3s ease',
              fontSize: '14px'
            }}>
            Shipper
          </button>
          <button 
            onClick={() => { setActiveTab('admin'); setError(''); }}
            style={{ 
              flex: 1, padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer',
              background: activeTab === 'admin' ? 'white' : 'transparent',
              color: activeTab === 'admin' ? '#111' : 'white',
              fontWeight: 600, transition: 'all 0.3s ease',
              fontSize: '14px'
            }}>
            Quản trị viên
          </button>
        </div>

        <form onSubmit={handleSubmit} className="glass-card" style={{ padding:'32px', borderRadius:'24px' }}>
          {error && (
            <div style={{ 
              background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', 
              borderRadius:'12px', padding:'14px', marginBottom:'24px', fontSize:'13px', 
              color:'#ef4444', display:'flex', alignItems:'center', gap:'8px' 
            }}>
              <span>⚠️</span> {error}
            </div>
          )}
          
          <div style={{ marginBottom:'20px' }}>
            <label className="input-label" style={{ marginBottom:'8px', display:'block', fontSize:'13px', fontWeight:600 }}>Email</label>
            <input 
              className="input-field" type="email" placeholder="you@example.com" 
              value={email} onChange={e=>setEmail(e.target.value)} required 
              style={{ padding:'14px 16px' }}
            />
          </div>
          
          <div style={{ marginBottom:'28px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
              <label className="input-label" style={{ margin:0, fontSize:'13px', fontWeight:600 }}>Mật khẩu</label>
              <Link href="/forgot-password" style={{ fontSize:'12px', color:'var(--accent)' }}>Quên mật khẩu?</Link>
            </div>
            <input 
              className="input-field" type="password" placeholder="••••••••" 
              value={password} onChange={e=>setPassword(e.target.value)} required 
              style={{ padding:'14px 16px' }}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}
            style={{ 
              width:'100%', justifyContent:'center', padding:'16px', borderRadius:'16px',
              fontSize:'16px', fontWeight:700, boxShadow: '0 10px 20px rgba(59, 130, 246, 0.2)'
            }}>
            {loading ? (
              <span style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <span className="animate-spin">🌀</span> Đang xác thực...
              </span>
            ) : (
              `Đăng nhập ${activeTab === 'admin' ? 'Admin' : activeTab === 'shipper' ? 'Shipper' : ''}`
            )}
          </button>

          {activeTab === 'user' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0 16px 0' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
                <span style={{ margin: '0 12px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>HOẶC</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
              </div>

              <button 
                type="button" 
                onClick={async () => {
                  addToast('Đang kết nối với Google... 🌐');
                  try {
                    const { error } = await supabase.auth.signInWithOAuth({
                      provider: 'google',
                      options: {
                        redirectTo: `${window.location.origin}/callback`
                      }
                    });
                    if (error) {
                      addToast('Không thể kết nối Google: ' + error.message);
                    }
                  } catch (err) {
                    addToast('Không thể kết nối Google: ' + (err instanceof Error ? err.message : 'lỗi không xác định'));
                  }
                }}
                style={{ 
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  gap: '10px', padding: '14px', backgroundColor: '#ffffff', color: '#1f2937', 
                  borderRadius: '16px', border: '1px solid #e5e7eb', 
                  fontWeight: 700, fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                }}>
                <FcGoogle size={22} />
                Tiếp tục với Google
              </button>
            </>
          )}

          {activeTab === 'user' && (
            <p style={{ textAlign:'center', marginTop:'24px', fontSize:'14px', color:'var(--text-muted)' }}>
              Chưa có tài khoản? <Link href={registerHref} style={{ color:'var(--accent)', fontWeight:700 }}>Tham gia ngay</Link>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
