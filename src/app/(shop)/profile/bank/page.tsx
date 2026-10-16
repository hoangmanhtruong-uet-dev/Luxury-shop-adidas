'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';
import { useToastStore } from '@/components/ui/Toast';
import { authenticatedFetch } from '@/lib/auth/authenticated-fetch';
import { FiLock, FiShield, FiPlus, FiCreditCard, FiTrash2, FiDownload, FiArrowUpRight, FiArrowDownLeft, FiEye } from 'react-icons/fi';

interface BankInfo {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  isDefault: boolean;
}

interface WalletInfo {
  balance: string;
  currency: string;
  hasPaymentPin: boolean;
}

function apiMessage(data: unknown, fallback: string) {
  if (typeof data !== 'object' || data === null || !('error' in data)) return fallback;
  const error = (data as { error?: unknown }).error;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') return error.message;
  return fallback;
}

const MIN_TOP_UP = 100000n;
const MAX_TOP_UP = 100000000n;

function validateTopUpAmount(value: string) {
  if (!/^(0|[1-9]\d*)$/.test(value)) return 'Vui lòng nhập số tiền hợp lệ';
  const amount = BigInt(value);
  if (amount < MIN_TOP_UP || amount > MAX_TOP_UP) return 'Số tiền nạp phải từ 100.000 ₫ đến 100.000.000 ₫';
  return null;
}

export default function BankPage() {
  const addToast = useToastStore(s => s.addToast);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [banks, setBanks] = useState<BankInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('1000000');
  const topUpError = validateTopUpAmount(topUpAmount);
  const [pinForm, setPinForm] = useState({ pin: '' });
  const [bankForm, setBankForm] = useState({ bankName: 'Vietcombank - TMCP Ngoại Thương VN', accountNumber: '', accountName: '', isDefault: true });
  const [showBalance, setShowBalance] = useState(true);

  const reload = useCallback(async () => {
    try {
      const [balanceRes, bankRes] = await Promise.all([
        authenticatedFetch('/api/user/balance'),
        authenticatedFetch('/api/user/bank'),
      ]);
      if (balanceRes.status === 401 || bankRes.status === 401) {
        setAuthError(true);
        return;
      }
      if (!balanceRes.ok || !bankRes.ok) throw new Error('Không tải được thông tin ví');
      setWallet(await balanceRes.json());
      setBanks(await bankRes.json());
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Không tải được trang ngân hàng', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { void reload(); }, [reload]);

  const handleTopUp = async (amount = topUpAmount) => {
    const validationError = validateTopUpAmount(amount);
    if (validationError) {
      addToast(validationError, 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await authenticatedFetch('/api/user/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiMessage(data, 'Nạp tiền demo thất bại'));
      setWallet(prev => prev ? { ...prev, balance: data.balance } : prev);
      addToast(`Đã nạp ${formatPrice(Number(data.amount))} vào số dư demo`);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Nạp tiền demo thất bại', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handlePin = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const res = await authenticatedFetch('/api/user/payment-pin', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pinForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiMessage(data, 'Không thể cập nhật PIN'));
      setWallet(prev => prev ? { ...prev, hasPaymentPin: true } : prev);
      setPinForm({ pin: '' });
      addToast('Đã cập nhật mã PIN giao dịch');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Không thể cập nhật PIN', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleBank = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const res = await authenticatedFetch('/api/user/bank', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bankForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiMessage(data, 'Không thể thêm tài khoản'));
      setBankForm({ bankName: 'Vietcombank - TMCP Ngoại Thương VN', accountNumber: '', accountName: '', isDefault: true });
      await reload();
      addToast('Đã thêm tài khoản ngân hàng');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Không thể thêm tài khoản', 'error');
    } finally {
      setBusy(false);
    }
  };

  const deleteBank = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa tài khoản này?')) return;
    try {
      const res = await authenticatedFetch(`/api/user/bank/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Không thể xóa tài khoản');
      await reload();
      addToast('Đã xóa tài khoản');
    } catch (error) {
      addToast('Tính năng xóa đang được phát triển hoặc có lỗi xảy ra', 'error');
    }
  };

  if (authError) return (
    <div className="glass-card" style={{ padding: 32, textAlign: 'center', borderRadius: 24 }}>
      <p>Phiên đăng nhập đã hết hạn.</p>
      <Link href="/login?from=/profile/bank" className="btn-primary" style={{ padding: '12px 24px', borderRadius: 12 }}>Đăng nhập lại</Link>
    </div>
  );
  
  if (loading) return <div className="glass-card" style={{ padding: 32, borderRadius: 24, textAlign: 'center' }}>Đang tải dữ liệu ví...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* Top Banner / Balance */}
      <section className="glass-card" style={{ padding: 32, borderRadius: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 13, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 6 }}><FiCreditCard /> NGÂN HÀNG DEMO & CÚN FINTECH</span>
              <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>Trực tuyến 24/7</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Số dư khả dụng ví test:</span>
              <button onClick={() => setShowBalance(!showBalance)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}><FiEye /></button>
            </div>
            
            <div style={{ fontSize: 42, fontWeight: 800, color: '#fff', letterSpacing: '-1px', marginBottom: 12, display: 'flex', alignItems: 'baseline', gap: 8 }}>
              {showBalance ? formatPrice(Number(wallet?.balance ?? 0)).replace('₫', '') : '******'} 
              <span style={{ fontSize: 24, color: 'var(--accent)' }}>đ</span>
            </div>
            
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, maxWidth: 500, lineHeight: 1.6, margin: 0 }}>
              Đây là số dư tiền mô phỏng trong hệ thống thương mại điện tử Cún-shop để thử nghiệm thanh toán đơn hàng & trải nghiệm API, hoàn toàn an toàn và không liên kết trực tiếp với ngân hàng hay ví MoMo thực tế.
            </p>
          </div>
          
          <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', padding: '16px 24px', borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 1 }}>
            <FiLock size={24} color="#10b981" />
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>Bảo mật giao dịch</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Cấp độ Level 4</div>
          </div>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '32px 0' }} />

        {/* Phase 1.2: the demo top-up endpoint is rejected in production, so the UI
            must not advertise it there. `process.env.NODE_ENV` is inlined at build time. */}
        {process.env.NODE_ENV !== 'production' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--accent)' }}>⚡</span> Nạp nhanh số dư thử nghiệm:
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Hạn mức nạp: Không giới hạn</div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            {['500000', '1000000', '5000000', '10000000'].map(amount => (
              <button key={amount} type="button" disabled={busy} onClick={() => { setTopUpAmount(amount); void handleTopUp(amount); }}
                style={{ 
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', 
                  padding: '14px', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6
                }}>
                <span style={{ color: 'var(--accent)' }}>+</span> {formatPrice(Number(amount))}
              </button>
            ))}
          </div>
          
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                className="input-field"
                inputMode="numeric"
                maxLength={9}
                value={topUpAmount}
                onChange={e => setTopUpAmount(e.target.value.replace(/\D/g, ''))}
                placeholder="Số tiền (VNĐ)"
                style={{ padding: '16px 20px', fontSize: 16, fontWeight: 600, background: 'rgba(0,0,0,0.2)' }}
              />
              <span style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)', fontWeight: 700 }}>đ</span>
            </div>
            <button type="button" className="btn-primary" disabled={busy || Boolean(topUpError)} onClick={() => void handleTopUp()} style={{ padding: '0 32px', borderRadius: 12, fontSize: 15, fontWeight: 700, boxShadow: '0 8px 20px rgba(249, 115, 22, 0.3)' }}>
              ⚡ Nạp demo ngay
            </button>
          </div>
          {topUpError && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{topUpError}</p>}
        </div>
        )}
      </section>

      {/* Grid: PIN & Bank Add */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        
        <section className="glass-card" style={{ padding: 32, borderRadius: 24, background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <FiShield size={20} color="var(--accent)" />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>PIN Giao Dịch & Bảo Mật</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5, marginBottom: 24 }}>
            {wallet?.hasPaymentPin ? 'PIN đã được thiết lập. Bạn có thể đổi PIN để tăng cường bảo mật.' : 'Tạo mã PIN 6 số bí mật để xác nhận nhanh khi thanh toán đơn hàng bằng Internet Banking hoặc MoMo.'}
          </p>
          
          <form onSubmit={handlePin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 8 }}>Mã PIN mới (6 chữ số)</label>
              <input className="input-field" type="password" inputMode="numeric" required maxLength={6} pattern="\d{6}" value={pinForm.pin} onChange={e => setPinForm({ ...pinForm, pin: e.target.value.replace(/\D/g, '') })} placeholder="Ví dụ: 123456" style={{ background: 'rgba(0,0,0,0.2)', letterSpacing: 4, fontFamily: 'monospace', fontSize: 16 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 8 }}>Xác nhận mã PIN mới</label>
              <input className="input-field" type="password" inputMode="numeric" required maxLength={6} pattern="\d{6}" placeholder="Nhập lại 6 chữ số" style={{ background: 'rgba(0,0,0,0.2)', letterSpacing: 4, fontFamily: 'monospace', fontSize: 16 }} />
            </div>
            
            <button className="btn-secondary" disabled={busy} style={{ marginTop: 8, padding: 14, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#fff' }}><FiShield /> {wallet?.hasPaymentPin ? 'Cập nhật mã PIN' : 'Tạo mã PIN'}</span>
            </button>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}><FiLock size={12} /> Mã hóa RSA-256 Cloud</span>
              <span style={{ fontSize: 11, color: 'var(--accent)', cursor: 'pointer' }}>Quên mã PIN?</span>
            </div>
          </form>
        </section>

        <section className="glass-card" style={{ padding: 32, borderRadius: 24, background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <FiPlus size={20} color="#0ea5e9" />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Thêm Tài Khoản Ngân Hàng</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5, marginBottom: 24 }}>
            Tài khoản dùng để chọn nguồn thanh toán demo hoặc nhận tiền hoàn trả tự động trong hệ thống.
          </p>
          
          <form onSubmit={handleBank} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 8 }}>Ngân hàng thụ hưởng</label>
              <select className="input-field" required value={bankForm.bankName} onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })} style={{ background: 'rgba(0,0,0,0.2)' }}>
                <option>Vietcombank - TMCP Ngoại Thương VN</option>
                <option>MB Bank - Ngân hàng Quân Đội</option>
                <option>Techcombank - Kỹ Thương VN</option>
                <option>MoMo - Ví điện tử MoMo</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 8 }}>Số tài khoản / Số thẻ</label>
              <input className="input-field" required inputMode="numeric" value={bankForm.accountNumber} onChange={e => setBankForm({ ...bankForm, accountNumber: e.target.value.replace(/\D/g, '') })} placeholder="Ví dụ: 1820482819" style={{ background: 'rgba(0,0,0,0.2)', fontFamily: 'monospace', fontSize: 15 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 8 }}>Tên chủ tài khoản (In hoa không dấu)</label>
              <input className="input-field" required value={bankForm.accountName} onChange={e => setBankForm({ ...bankForm, accountName: e.target.value.toUpperCase() })} placeholder="TRUONG DEVELOPER HOANG" style={{ background: 'rgba(0,0,0,0.2)' }} />
            </div>
            
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: '#fff', cursor: 'pointer', marginTop: 4 }}>
              <input type="checkbox" checked={bankForm.isDefault} onChange={e => setBankForm({ ...bankForm, isDefault: e.target.checked })} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} /> 
              Đặt làm phương thức thanh toán mặc định
            </label>
            
            <button className="btn-primary" disabled={busy} style={{ marginTop: 8, padding: 14, borderRadius: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><FiCreditCard /> Thêm tài khoản ngân hàng</span>
            </button>
          </form>
        </section>
        
      </div>

      {/* Linked Accounts */}
      <section style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Tài Khoản & Thẻ Đã Liên Kết</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>Quản lý các thẻ/tài khoản khả dụng để thanh toán nhanh trong hệ thống</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: 8, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
            {banks.length} phương thức hoạt động
          </div>
        </div>
        
        {banks.length === 0 ? <div className="glass-card" style={{ padding: 40, textAlign: 'center', borderRadius: 24, color: 'var(--text-muted)' }}>Chưa có tài khoản nào được liên kết.</div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {banks.map(bank => {
              const isVCB = bank.bankName.includes('Vietcombank');
              const isMB = bank.bankName.includes('MB');
              const isMoMo = bank.bankName.includes('MoMo');
              
              let bgColor = 'rgba(255,255,255,0.03)';
              let logoText = 'BANK';
              let logoBg = '#334155';
              let logoColor = '#fff';

              if (isVCB) { bgColor = 'rgba(22, 163, 74, 0.05)'; logoText = 'VCB'; logoBg = '#16a34a'; }
              else if (isMB) { bgColor = 'rgba(14, 165, 233, 0.05)'; logoText = 'MB'; logoBg = '#0ea5e9'; }
              else if (isMoMo) { bgColor = 'rgba(236, 72, 153, 0.05)'; logoText = 'MoMo'; logoBg = '#ec4899'; }

              return (
                <div key={bank.id} className="glass-card" style={{ padding: 24, borderRadius: 20, background: bgColor, border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: logoBg, color: logoColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>
                        {logoText}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                          {isVCB ? 'Vietcombank' : isMB ? 'MB Bank Quân Đội' : isMoMo ? 'Ví MoMo Pay' : bank.bankName.split('-')[0]}
                          {bank.isDefault && <span style={{ background: 'rgba(249, 115, 22, 0.1)', color: 'var(--accent)', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>MẶC ĐỊNH</span>}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{isMoMo ? 'Thanh toán bằng QR' : 'Phát hành bởi Napas'}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                    <div style={{ fontSize: 20, letterSpacing: 4, fontFamily: 'monospace' }}>
                      **** **** {bank.accountNumber.slice(-4)}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{isMoMo ? 'Ví điện tử cá nhân' : bank.accountName}</div>
                    </div>
                    <div style={{ color: '#10b981', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                      <FiShield /> Đã xác thực
                    </div>
                  </div>

                  <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '16px -24px' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>Chỉnh sửa</span>
                    <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }} onClick={() => deleteBank(bank.id)}>Hủy kết nối</span>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Mock Transaction History */}
      <section className="glass-card" style={{ padding: 32, borderRadius: 24, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Lịch Sử Biến Động Số Dư Gần Đây</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>Nhật ký các lần nạp demo & kiểm thử thanh toán giỏ hàng</p>
          </div>
          <button style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            Xuất sao kê test <FiDownload />
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 11, textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Mã GD & Thời Gian</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Loại Giao Dịch</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Nguồn Tiền</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>Số Tiền Biến Động</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'center' }}>Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              {/* Mock Row 1 */}
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontWeight: 600 }}>#TXN-884920</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>29/09/2026 - 22:15</div>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', fontWeight: 500 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiArrowDownLeft size={14} /></div>
                    Nạp tiền số dư Demo
                  </div>
                </td>
                <td style={{ padding: '16px', color: 'rgba(255,255,255,0.8)' }}>Hệ thống Sandbox<br/><span style={{fontSize:12,color:'var(--text-muted)'}}>CÚN</span></td>
                <td style={{ padding: '16px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>+1.000.000 đ</td>
                <td style={{ padding: '16px', textAlign: 'center' }}>
                  <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>Thành công</span>
                </td>
              </tr>
              {/* Mock Row 2 */}
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontWeight: 600 }}>#TXN-881105</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>25/09/2026 - 14:20</div>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontWeight: 500 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiArrowUpRight size={14} /></div>
                    Thanh toán đơn #ORD-9938
                  </div>
                </td>
                <td style={{ padding: '16px', color: 'rgba(255,255,255,0.8)' }}>Số dư khả dụng</td>
                <td style={{ padding: '16px', textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>-2.450.000 đ</td>
                <td style={{ padding: '16px', textAlign: 'center' }}>
                  <span style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>Đã quyết toán</span>
                </td>
              </tr>
              {/* Mock Row 3 */}
              <tr>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontWeight: 600 }}>#TXN-852049</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>20/09/2026 - 09:12</div>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', fontWeight: 500 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiArrowDownLeft size={14} /></div>
                    Nạp tiền số dư Demo
                  </div>
                </td>
                <td style={{ padding: '16px', color: 'rgba(255,255,255,0.8)' }}>MB Bank (Thử nghiệm)</td>
                <td style={{ padding: '16px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>+5.000.000 đ</td>
                <td style={{ padding: '16px', textAlign: 'center' }}>
                  <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>Thành công</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}