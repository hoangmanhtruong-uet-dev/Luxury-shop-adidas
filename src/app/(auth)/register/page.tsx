'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FcGoogle } from 'react-icons/fc';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/components/ui/Toast';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const register = useAuthStore(s => s.register);
  const addToast = useToastStore(s => s.addToast);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('from');
  const safeRedirect = redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/';
  const loginHref = redirectTo ? '/login?from=' + encodeURIComponent(redirectTo) : '/login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await register(name, email, password, confirm);

    if (result.ok) {
      addToast('Đăng ký thành công! 🎉');
      router.push(safeRedirect);
      router.refresh();
    } else {
      setError(result.error || 'Đăng ký thất bại');
    }
    setLoading(false);
  };

  return (
    <div className="page-container" style={{ display:'flex', justifyContent:'center', paddingTop:'120px' }}>
      <div style={{ width:'100%', maxWidth:'440px' }}>
        <div style={{ textAlign:'center', marginBottom:'40px' }}>
          <span style={{ fontSize:'48px', display:'block', marginBottom:'16px' }}>✨</span>
          <h1 style={{ fontSize:'28px', fontWeight:800, marginBottom:'8px' }}>Tạo tài khoản</h1>
          <p style={{ color:'var(--text-muted)', fontSize:'14px' }}>Tham gia Cún-shop ngay hôm nay</p>
        </div>
        <form onSubmit={handleSubmit} className="glass-card" style={{ padding:'32px' }}>
          {error && <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'var(--radius-md)', padding:'12px', marginBottom:'20px', fontSize:'13px', color:'#ef4444' }}>{error}</div>}
          <div style={{ marginBottom:'16px' }}>
            <label className="input-label">Họ và tên</label>
            <input className="input-field" placeholder="Nguyễn Văn A" value={name} onChange={e=>setName(e.target.value)} required />
          </div>
          <div style={{ marginBottom:'16px' }}>
            <label className="input-label">Email</label>
            <input className="input-field" type="email" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div style={{ marginBottom:'16px' }}>
            <label className="input-label">Mật khẩu</label>
            <input className="input-field" type="password" placeholder="Tối thiểu 6 ký tự" value={password} onChange={e=>setPassword(e.target.value)} required />
          </div>
          <div style={{ marginBottom:'24px' }}>
            <label className="input-label">Xác nhận mật khẩu</label>
            <input className="input-field" type="password" placeholder="Nhập lại mật khẩu" value={confirm} onChange={e=>setConfirm(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}
            style={{ width:'100%', justifyContent:'center', padding:'14px', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
          </button>

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
              gap: '10px', padding: '12px', backgroundColor: '#ffffff', color: '#1f2937', 
              borderRadius: 'var(--radius-md)', border: '1px solid #e5e7eb', 
              fontWeight: 600, fontSize: '14.5px', cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
            <FcGoogle size={20} />
            Đăng ký bằng Google
          </button>

          <p style={{ textAlign:'center', marginTop:'24px', fontSize:'14px', color:'var(--text-muted)' }}>
            Đã có tài khoản? <Link href={loginHref} style={{ color:'var(--accent)', fontWeight:600 }}>Đăng nhập</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
