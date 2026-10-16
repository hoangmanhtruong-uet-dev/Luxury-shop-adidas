'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToastStore } from '@/components/ui/Toast';
import { FiMapPin, FiEdit3, FiTrash2, FiClock, FiPlus, FiNavigation, FiCheckCircle } from 'react-icons/fi';
import { RiBuilding4Line, RiHome4Line } from 'react-icons/ri';

interface Address {
  id: string;
  fullName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  detailAddress: string;
  isDefault: boolean;
}

type AddressForm = Omit<Address, 'id'>;

const emptyForm: AddressForm = {
  fullName: '',
  phone: '',
  province: '',
  district: '',
  ward: '',
  detailAddress: '',
  isDefault: false,
};

export default function AddressPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [formData, setFormData] = useState<AddressForm>(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const addToast = useToastStore(state => state.addToast);

  const fetchAddresses = useCallback(async () => {
    try {
      const response = await fetch('/api/user/addresses');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể tải địa chỉ');
      setAddresses(Array.isArray(data) ? data : []);
    } catch (caught) {
      addToast(caught instanceof Error ? caught.message : 'Không thể tải địa chỉ', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const openAdd = () => {
    setEditingId('');
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEdit = (address: Address) => {
    setEditingId(address.id);
    setFormData({
      fullName: address.fullName,
      phone: address.phone,
      province: address.province,
      district: address.district,
      ward: address.ward,
      detailAddress: address.detailAddress,
      isDefault: address.isDefault,
    });
    setShowModal(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(editingId ? `/api/user/addresses/${editingId}` : '/api/user/addresses', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể lưu địa chỉ');
      addToast(editingId ? 'Đã cập nhật địa chỉ.' : 'Đã thêm địa chỉ mới.');
      setShowModal(false);
      await fetchAddresses();
    } catch (caught) {
      addToast(caught instanceof Error ? caught.message : 'Không thể lưu địa chỉ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteAddress = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa địa chỉ này?')) return;
    try {
      const response = await fetch(`/api/user/addresses/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể xóa địa chỉ');
      addToast('Đã xóa địa chỉ.');
      await fetchAddresses();
    } catch (caught) {
      addToast(caught instanceof Error ? caught.message : 'Không thể xóa địa chỉ', 'error');
    }
  };

  const setAsDefault = async (address: Address) => {
    if (address.isDefault) return;
    try {
      const payload = { ...address, isDefault: true };
      const response = await fetch(`/api/user/addresses/${address.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        addToast('Đã cập nhật địa chỉ mặc định.');
        await fetchAddresses();
      }
    } catch (error) {
      addToast('Không thể thiết lập mặc định.', 'error');
    }
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Header Card */}
        <div className="glass-card" style={{ padding: '32px', borderRadius: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: 'var(--accent)', display: 'flex' }}><FiMapPin size={24} /></span>
              Địa Chỉ Của Tôi
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Quản lý danh sách địa chỉ nhận hàng để thanh toán nhanh hơn và cá nhân hóa trải nghiệm giao nhận chuẩn Cún Express.
            </p>
          </div>
          <button type="button" onClick={openAdd} className="btn-primary" style={{ padding: '14px 24px', borderRadius: '12px', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', boxShadow: '0 8px 20px rgba(249, 115, 22, 0.3)' }}>
            <FiPlus size={20} /> Thêm địa chỉ mới
          </button>
        </div>

        {/* Address List */}
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</p>
        ) : addresses.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '24px' }}>Bạn chưa có địa chỉ nào.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {addresses.sort((a,b) => (a.isDefault === b.isDefault ? 0 : a.isDefault ? -1 : 1)).map(address => (
              <div key={address.id} className="glass-card" style={{ 
                padding: '24px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', 
                border: address.isDefault ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.05)',
                background: address.isDefault ? 'rgba(249, 115, 22, 0.02)' : 'rgba(255,255,255,0.02)',
                position: 'relative', overflow: 'hidden'
              }}>
                {address.isDefault && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: 'var(--accent)' }} />}
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '16px' }}>{address.fullName}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>|</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{address.phone.startsWith('0') ? `(+84) ${address.phone.substring(1,4)} ${address.phone.substring(4,7)} ${address.phone.substring(7)}` : address.phone}</span>
                    
                    {address.isDefault && (
                      <span style={{ fontSize: '11px', padding: '4px 8px', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: '4px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FiCheckCircle size={12} /> MẶC ĐỊNH
                      </span>
                    )}
                    
                    <span style={{ fontSize: '11px', padding: '4px 8px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)', borderRadius: '4px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {address.detailAddress.toLowerCase().includes('tòa') || address.detailAddress.toLowerCase().includes('tower') ? <RiBuilding4Line size={12} /> : <RiHome4Line size={12} />}
                      {address.detailAddress.toLowerCase().includes('tòa') || address.detailAddress.toLowerCase().includes('tower') ? 'Văn phòng / Doanh nghiệp' : 'Nhà riêng'}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '15px', color: '#fff', marginBottom: '4px' }}>{address.detailAddress}</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>{address.ward}, {address.district}, {address.province}</div>
                  
                  {address.isDefault ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '13px', fontWeight: 600 }}>
                      <span style={{ display: 'flex', alignItems: 'center' }}>⚡</span> Hỗ trợ Giao hỏa tốc 2 giờ & Bảo vệ chuyên biệt Flagship
                    </div>
                  ) : (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px' }}>
                      <FiClock /> Giao giờ hành chính hoặc cuối tuần
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', minWidth: '150px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <button type="button" onClick={() => openEdit(address)} style={{ color: 'var(--accent)', background: 'none', border: 0, cursor: 'pointer', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FiEdit3 /> Cập nhật
                    </button>
                    {!address.isDefault && (
                      <button type="button" onClick={() => deleteAddress(address.id)} style={{ color: '#ef4444', background: 'none', border: 0, cursor: 'pointer', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FiTrash2 /> Xóa
                      </button>
                    )}
                  </div>
                  
                  <button 
                    type="button" 
                    onClick={() => setAsDefault(address)}
                    disabled={address.isDefault}
                    style={{ 
                      padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                      background: address.isDefault ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                      border: address.isDefault ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)',
                      color: address.isDefault ? 'var(--text-muted)' : '#fff',
                      cursor: address.isDefault ? 'default' : 'pointer'
                    }}
                  >
                    {address.isDefault ? 'Đã đặt mặc định' : 'Thiết lập mặc định'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* GPS Card */}
        <div className="glass-card" style={{ padding: '24px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiNavigation size={24} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Đồng bộ định vị thông minh qua GPS</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tự động đề xuất địa chỉ gần nhất khi giao các sản phẩm giá trị cao và gói quà tặng VIP.</div>
            </div>
          </div>
          <button type="button" className="btn-secondary" style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600 }}>
            Hiệu chỉnh tọa độ
          </button>
        </div>

      </div>

      {showModal && (
        <div className="modal-overlay" style={{ zIndex: 1000, padding: '16px' }} onMouseDown={event => {
          if (event.target === event.currentTarget && !saving) setShowModal(false);
        }}>
          <form onSubmit={handleSubmit} className="glass-card" style={{ width: 'min(600px, 100%)', maxWidth: '600px', maxHeight: 'calc(100dvh - 32px)', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', borderRadius: '24px', background: '#111', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>{editingId ? 'Sửa địa chỉ nhận hàng' : 'Thêm địa chỉ mới'}</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>Họ và tên</label>
                <input required minLength={2} placeholder="Họ và tên" className="input-field" value={formData.fullName} onChange={event => setFormData({ ...formData, fullName: event.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>Số điện thoại</label>
                <input required pattern="0[0-9]{9}" placeholder="09xxxx" className="input-field" value={formData.phone} onChange={event => setFormData({ ...formData, phone: event.target.value.replace(/\D/g, '') })} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>Tỉnh/Thành phố</label>
                <input required minLength={2} placeholder="Hồ Chí Minh" className="input-field" value={formData.province} onChange={event => setFormData({ ...formData, province: event.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>Quận/Huyện</label>
                <input required minLength={2} placeholder="Quận 1" className="input-field" value={formData.district} onChange={event => setFormData({ ...formData, district: event.target.value })} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>Phường/Xã</label>
              <input required minLength={2} placeholder="Phường Bến Nghé" className="input-field" value={formData.ward} onChange={event => setFormData({ ...formData, ward: event.target.value })} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>Địa chỉ cụ thể</label>
              <textarea rows={3} required minLength={5} placeholder="Số nhà, tên đường, tòa nhà..." className="input-field" value={formData.detailAddress} onChange={event => setFormData({ ...formData, detailAddress: event.target.value })} />
            </div>

            <label style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
              <input type="checkbox" checked={formData.isDefault} onChange={event => setFormData({ ...formData, isDefault: event.target.checked })} style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }} />
              <span style={{ fontSize: '14px', fontWeight: 500 }}>Đặt làm địa chỉ mặc định</span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" style={{ padding: '12px 24px', borderRadius: '12px' }}>Trở lại</button>
              <button type="submit" disabled={saving} className="btn-primary" style={{ padding: '12px 32px', borderRadius: '12px' }}>{saving ? 'Đang lưu...' : 'Hoàn thành'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

