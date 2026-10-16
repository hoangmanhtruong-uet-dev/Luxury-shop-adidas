'use client';
import { useState, useEffect } from 'react';
import { useToastStore } from '@/components/ui/Toast';

type SiteConfig = {
  siteName: string;
  hotline: string;
  contactEmail: string;
  address: string;
  codEnabled: boolean;
  momoEnabled: boolean;
  bankingEnabled: boolean;
  vnpayEnabled: boolean;
  stripeEnabled: boolean;
  lowStockThreshold: number;
  maintenanceMode: boolean;
  lastBackupAt: string | null;
};

const defaultConfig: SiteConfig = {
  siteName: 'Cún-shop',
  hotline: '0968 544 769',
  contactEmail: 'support@cun-shop.store',
  address: 'Việt Nam',
  codEnabled: true,
  momoEnabled: true,
  bankingEnabled: true,
  vnpayEnabled: false,
  stripeEnabled: false,
  lowStockThreshold: 10,
  maintenanceMode: false,
  lastBackupAt: null,
};

export default function AdminSettingsPage() {
  const [config, setConfig] = useState<SiteConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const addToast = useToastStore(s => s.addToast);

  useEffect(() => {
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          setConfig({
            siteName: data.siteName ?? defaultConfig.siteName,
            hotline: data.hotline ?? defaultConfig.hotline,
            contactEmail: data.contactEmail ?? defaultConfig.contactEmail,
            address: data.address ?? defaultConfig.address,
            codEnabled: data.codEnabled ?? true,
            momoEnabled: data.momoEnabled ?? true,
            bankingEnabled: data.bankingEnabled ?? true,
            vnpayEnabled: data.vnpayEnabled ?? false,
            stripeEnabled: data.stripeEnabled ?? false,
            lowStockThreshold: data.lowStockThreshold ?? 10,
            maintenanceMode: data.maintenanceMode ?? false,
            lastBackupAt: data.lastBackupAt ?? null,
          });
        }
      })
      .catch(() => addToast('Không tải được cấu hình.'))
      .finally(() => setLoading(false));
  }, [addToast]);

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (res.ok) {
        addToast(data.message || 'Đã lưu cấu hình website! ✨');
        if (data.config?.lastBackupAt) {
          setConfig(c => ({ ...c, lastBackupAt: data.config.lastBackupAt }));
        }
      } else {
        addToast(data.error || 'Lưu thất bại.');
      }
    } catch {
      addToast('Lỗi kết nối.');
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (action: 'backup' | 'clearCache') => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast(data.message);
        if (action === 'backup' && data.lastBackupAt) {
          setConfig(c => ({ ...c, lastBackupAt: data.lastBackupAt }));
        }
      } else {
        addToast(data.error || 'Thao tác thất bại.');
      }
    } catch {
      addToast('Lỗi kết nối.');
    }
  };

  const togglePayment = (key: keyof Pick<SiteConfig, 'codEnabled' | 'momoEnabled' | 'bankingEnabled' | 'vnpayEnabled' | 'stripeEnabled'>) => {
    setConfig(c => ({ ...c, [key]: !c[key] }));
  };

  const paymentItems = [
    { key: 'codEnabled' as const, name: 'Thanh toán COD', note: 'Thanh toán khi nhận hàng' },
    { key: 'bankingEnabled' as const, name: 'Chuyển khoản (Banking)', note: 'Giả lập ngân hàng nội địa' },
    { key: 'momoEnabled' as const, name: 'Ví MoMo', note: 'Giả lập ví điện tử' },
    { key: 'vnpayEnabled' as const, name: 'VNPAY', note: 'Cổng VNPay (chưa tích hợp thật)' },
    { key: 'stripeEnabled' as const, name: 'Thẻ tín dụng (Stripe)', note: 'Chưa tích hợp thật' },
  ];

  if (loading) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>Đang tải cấu hình...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 900 }}>Cấu Hình Hệ Thống</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Thiết lập lưu trong database (bảng SiteConfig). Thay đổi có hiệu lực sau khi bấm Lưu.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        <div className="glass-card" style={{ padding: '40px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '25px' }}>Thông tin Website</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Tên Website</label>
              <input className="input-field" value={config.siteName} onChange={e => setConfig(c => ({ ...c, siteName: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Hotline Hệ Thống</label>
              <input className="input-field" value={config.hotline} onChange={e => setConfig(c => ({ ...c, hotline: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Email Liên Hệ</label>
              <input className="input-field" type="email" value={config.contactEmail} onChange={e => setConfig(c => ({ ...c, contactEmail: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Địa chỉ / Footer</label>
              <input className="input-field" value={config.address} onChange={e => setConfig(c => ({ ...c, address: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Ngưỡng cảnh báo tồn kho thấp</label>
              <input className="input-field" type="number" min={1} value={config.lowStockThreshold} onChange={e => setConfig(c => ({ ...c, lowStockThreshold: parseInt(e.target.value, 10) || 10 }))} style={{ width: '100%' }} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
              <input type="checkbox" checked={config.maintenanceMode} onChange={e => setConfig(c => ({ ...c, maintenanceMode: e.target.checked }))} />
              Chế độ bảo trì (chặn checkout — sẽ bổ sung sau)
            </label>
            <button type="button" onClick={saveConfig} disabled={saving} className="btn-primary" style={{ marginTop: '10px', padding: '12px' }}>
              {saving ? 'Đang lưu...' : 'Lưu thông tin'}
            </button>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '40px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '25px' }}>Cổng Thanh Toán</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '-15px', marginBottom: '20px' }}>Bật/tắt phương thức hiển thị ở checkout (lưu DB).</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {paymentItems.map((p) => {
              const enabled = config[p.key];
              return (
                <div key={p.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{p.name}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: enabled ? '#10b981' : 'rgba(255,255,255,0.35)' }}>
                      ● {enabled ? 'Đã kích hoạt' : 'Đã tắt'} — {p.note}
                    </p>
                  </div>
                  <button type="button" onClick={() => togglePayment(p.key)} className="btn-secondary" style={{ fontSize: '11px', padding: '5px 12px' }}>
                    {enabled ? 'Tắt' : 'Bật'}
                  </button>
                </div>
              );
            })}
          </div>
          <button type="button" onClick={saveConfig} disabled={saving} className="btn-primary" style={{ marginTop: '20px', width: '100%', padding: '12px' }}>
            Lưu cổng thanh toán
          </button>
        </div>

        <div className="glass-card" style={{ padding: '40px', gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '25px' }}>Bảo Mật & Dữ Liệu</h3>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1, padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: '24px', margin: '0 0 10px' }}>🛡️</p>
              <p style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 5px' }}>Trạng thái hệ thống</p>
              <p style={{ fontSize: '11px', color: '#10b981', marginBottom: '15px' }}>● Đang hoạt động</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>JWT + phân quyền admin</p>
            </div>
            <div style={{ flex: 1, padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: '24px', margin: '0 0 10px' }}>💾</p>
              <p style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 5px' }}>Sao lưu Database</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '15px' }}>
                Lần cuối: {config.lastBackupAt ? new Date(config.lastBackupAt).toLocaleString('vi-VN') : 'Chưa có'}
              </p>
              <button type="button" onClick={() => runAction('backup')} className="btn-secondary" style={{ width: '100%', fontSize: '12px' }}>Ghi nhận sao lưu</button>
            </div>
            <div style={{ flex: 1, padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: '24px', margin: '0 0 10px' }}>🚀</p>
              <p style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 5px' }}>Xóa Cache</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '15px' }}>Làm mới dữ liệu API phía server</p>
              <button type="button" onClick={() => runAction('clearCache')} className="btn-secondary" style={{ width: '100%', fontSize: '12px' }}>Dọn dẹp ngay</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
