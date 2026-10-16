'use client';
import { FormEvent, useEffect, useState } from 'react';
import { useToastStore } from '@/components/ui/Toast';
import { FiCheckCircle, FiUploadCloud, FiShield, FiBriefcase, FiMapPin, FiCreditCard, FiAlertCircle } from 'react-icons/fi';

type Status = { status: string; rejectionReason?: string | null } | null;

export default function SellerRegisterPage() {
  const toast = useToastStore(s => s.addToast);
  const [status, setStatus] = useState<Status>(null);
  const [saving, setSaving] = useState(false);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  
  const [form, setForm] = useState({
    businessName: '',
    taxCode: '',
    industry: 'Thiết bị công nghệ & Flagship Gadgets',
    identityType: 'Căn cước công dân (CCCD gắn chip)',
    identityNumber: '',
    identityFrontUrl: '',
    identityBackUrl: '',
    businessAddress: ''
  });

  useEffect(() => {
    fetch('/api/user/seller-register')
      .then(r => r.json())
      .then(data => { if (data) setStatus(data); })
      .catch(e => console.error(e));
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'identityFrontUrl' | 'identityBackUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast('Ảnh không được vượt quá 5MB', 'error');
      return;
    }

    if (field === 'identityFrontUrl') setUploadingFront(true);
    else setUploadingBack(true);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi tải ảnh lên');
      
      setForm(prev => ({ ...prev, [field]: data.url }));
      toast('Tải ảnh thành công');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Lỗi tải ảnh lên', 'error');
    } finally {
      if (field === 'identityFrontUrl') setUploadingFront(false);
      else setUploadingBack(false);
    }
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!acceptedPolicy) {
      toast('Vui lòng đồng ý với các chính sách & cam kết!', 'error');
      return;
    }
    setSaving(true);
    try {
      const r = await fetch('/api/user/seller-register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, taxCode: form.taxCode || undefined })
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error?.message ?? b.error ?? 'Không thể gửi hồ sơ');
      setStatus(b);
      toast('Đã gửi hồ sơ KYC, vui lòng chờ Admin duyệt');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Không thể gửi hồ sơ', 'error');
    } finally {
      setSaving(false);
    }
  }

  const isPending = status?.status === 'PENDING';
  const isApproved = status?.status === 'APPROVED';
  const isRejected = status?.status === 'REJECTED';

  return (
    <div style={{ padding: '0 0 40px 0', maxWidth: '900px', margin: '0 auto', color: '#fff' }}>
      
      {/* Header Section */}
      <div className="glass-card" style={{ padding: '32px', borderRadius: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
          <FiShield size={16} /> Cún-shop PARTNER NETWORK
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 12px 0' }}>Đăng ký Người bán & Xác thực danh tính (KYC)</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '32px' }}>
          Trở thành đối tác bán hàng chính thức trên hệ sinh thái Cún-shop, tiếp cận hơn 500.000+ khách hàng tiềm năng.
        </p>

        {/* Steps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', overflowX: 'auto', paddingBottom: '10px' }}>
          <StepBadge number={1} title="Thông tin cửa hàng" active={true} />
          <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.1)', minWidth: '40px' }} />
          <StepBadge number={2} title="Giấy tờ pháp lý & CCCD" active={status !== null} />
          <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.1)', minWidth: '40px' }} />
          <StepBadge number={3} title="Kiểm duyệt & Kích hoạt" active={isApproved} />
        </div>

        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '16px 20px', borderRadius: '12px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <FiShield color="#10b981" size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ color: '#10b981', fontSize: '14px' }}>Bảo mật cấp ngân hàng: </strong>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: 1.5 }}>
              Cún-shop cam kết bảo mật 100% dữ liệu định danh cá nhân và thông tin thuế theo tiêu chuẩn mã hóa quốc tế AES-256. Giấy tờ chỉ sử dụng để đối soát pháp lý thương mại.
            </span>
          </div>
        </div>
      </div>

      {status && (
        <div className="glass-card" style={{ padding: '20px', marginBottom: '24px', borderLeft: `4px solid ${isApproved ? '#10b981' : isRejected ? '#ef4444' : '#f59e0b'}` }}>
          <h3 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Trạng thái hồ sơ: 
            <span style={{ color: isApproved ? '#10b981' : isRejected ? '#ef4444' : '#f59e0b' }}>
              {isApproved ? 'ĐÃ DUYỆT' : isRejected ? 'TỪ CHỐI' : 'ĐANG CHỜ DUYỆT'}
            </span>
          </h3>
          {status.rejectionReason && <p style={{ color: '#ef4444', margin: 0, fontSize: '14px' }}><FiAlertCircle /> Lý do: {status.rejectionReason}</p>}
          {isPending && <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px' }}>Hồ sơ của bạn đang được xử lý, thời gian dự kiến 4-24 giờ làm việc.</p>}
        </div>
      )}

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Section 1 */}
        <div className="glass-card" style={{ padding: '32px', borderRadius: '16px' }}>
          <SectionTitle number="1" title="Thông tin DOANH NGHIỆP / Cửa hàng" />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Label text="Tên Doanh nghiệp / Thương hiệu Shop" required />
              <div className="input-group">
                <FiBriefcase className="input-icon" />
                <input required className="input-field with-icon" placeholder="TechZone Obsidian Flagship Store" value={form.businessName} onChange={e => setForm({...form, businessName: e.target.value})} disabled={isPending || isApproved} />
              </div>
            </div>

            <div>
              <Label text="Mã số thuế doanh nghiệp / Hộ kinh doanh" />
              <input className="input-field" placeholder="Nhập mã số thuế 10 hoặc 13 chữ số" value={form.taxCode} onChange={e => setForm({...form, taxCode: e.target.value})} disabled={isPending || isApproved} />
            </div>

            <div>
              <Label text="Ngành hàng chính dự kiến bán" required />
              <select className="input-field" value={form.industry} onChange={e => setForm({...form, industry: e.target.value})} disabled={isPending || isApproved}>
                <option>Giày đá bóng & Phụ kiện bóng đá</option>
                <option>Thương hiệu thể thao chính hãng</option>
                <option>Đồ thể thao & Quần áo bóng đá</option>
                <option>Bóng & Dụng cụ tập luyện</option>
              </select>
            </div>
          </div>

          <div>
            <Label text="Địa chỉ trụ sở kinh doanh / Kho hàng thực tế" required />
            <div className="input-group">
              <FiMapPin className="input-icon" style={{ top: '16px', transform: 'none' }} />
              <textarea required className="input-field with-icon" rows={3} placeholder="Tầng 18, Tòa tháp Bitexco Financial Tower, Quận 1, TP.HCM" value={form.businessAddress} onChange={e => setForm({...form, businessAddress: e.target.value})} disabled={isPending || isApproved} />
            </div>
          </div>
        </div>

        {/* Section 2 */}
        <div className="glass-card" style={{ padding: '32px', borderRadius: '16px' }}>
          <SectionTitle number="2" title="Xác thực Danh tính (KYC Người đại diện)" />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <div>
              <Label text="Loại giấy tờ định danh" required />
              <select className="input-field" value={form.identityType} onChange={e => setForm({...form, identityType: e.target.value})} disabled={isPending || isApproved}>
                <option>Căn cước công dân (CCCD gắn chip)</option>
                <option>Chứng minh nhân dân (CMND)</option>
                <option>Hộ chiếu (Passport)</option>
              </select>
            </div>
            <div>
              <Label text="Số CCCD / Hộ chiếu" required />
              <div className="input-group">
                <FiCreditCard className="input-icon" />
                <input required className="input-field with-icon" placeholder="079095012389" value={form.identityNumber} onChange={e => setForm({...form, identityNumber: e.target.value})} disabled={isPending || isApproved} />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <Label text="Ảnh mặt trước Giấy tờ" required />
              <div 
                className="upload-zone" 
                style={{ position: 'relative', padding: '30px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', cursor: (isPending || isApproved || uploadingFront) ? 'default' : 'pointer' }}
                onClick={() => { if (!isPending && !isApproved && !uploadingFront) document.getElementById('upload-front')?.click(); }}
              >
                <input id="upload-front" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleUpload(e, 'identityFrontUrl')} disabled={isPending || isApproved || uploadingFront} />
                {uploadingFront ? (
                  <div style={{ padding: '40px 0', color: 'var(--accent)' }}>Đang tải lên...</div>
                ) : form.identityFrontUrl ? (
                  <img src={form.identityFrontUrl} alt="Front" style={{ maxWidth: '100%', maxHeight: '140px', borderRadius: '8px' }} />
                ) : (
                  <>
                    <FiUploadCloud size={32} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Nhấn để chọn ảnh từ thiết bị</p>
                  </>
                )}
              </div>
            </div>

            <div>
              <Label text="Ảnh mặt sau Giấy tờ" required />
              <div 
                className="upload-zone" 
                style={{ position: 'relative', padding: '30px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', cursor: (isPending || isApproved || uploadingBack) ? 'default' : 'pointer' }}
                onClick={() => { if (!isPending && !isApproved && !uploadingBack) document.getElementById('upload-back')?.click(); }}
              >
                <input id="upload-back" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleUpload(e, 'identityBackUrl')} disabled={isPending || isApproved || uploadingBack} />
                {uploadingBack ? (
                  <div style={{ padding: '40px 0', color: 'var(--accent)' }}>Đang tải lên...</div>
                ) : form.identityBackUrl ? (
                  <img src={form.identityBackUrl} alt="Back" style={{ maxWidth: '100%', maxHeight: '140px', borderRadius: '8px' }} />
                ) : (
                  <>
                    <FiUploadCloud size={32} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Nhấn để chọn ảnh từ thiết bị</p>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '20px', marginTop: '20px', fontSize: '12px', color: '#10b981' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FiCheckCircle /> Đầy đủ 4 góc giấy tờ</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FiCheckCircle /> Không lóa sáng mất chữ</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FiCheckCircle /> Giấy tờ còn hạn sử dụng</span>
          </div>
        </div>

        {/* Section 3 */}
        <div className="glass-card" style={{ padding: '32px', borderRadius: '16px' }}>
          <SectionTitle number="3" title="Chính sách Người bán & Cam kết chất lượng" />
          
          <ol style={{ paddingLeft: '20px', color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
            <li style={{ marginBottom: '12px' }}><strong style={{ color: '#fff' }}>Cam kết nguồn gốc hàng hóa:</strong> Nhà bán hàng cam kết chỉ phân phối các mặt hàng chính hãng, có hóa đơn chứng từ đầy đủ. Nghiêm cấm phân phối hàng giả, hàng nhái, hàng vi phạm sở hữu trí tuệ trên Cún-shop.</li>
            <li style={{ marginBottom: '12px' }}><strong style={{ color: '#fff' }}>Quy chế hoàn tiền gấp 10 lần:</strong> Trong trường hợp khách hàng phát hiện sản phẩm giả/nhái đã qua thẩm định từ phía Shop, Shop chấp nhận bồi hoàn 100% giá trị đơn hàng và chịu mức phạt theo hợp đồng cung ứng dịch vụ.</li>
            <li><strong style={{ color: '#fff' }}>Bảo mật thông tin:</strong> Tuân thủ nghiêm ngặt chuẩn an ninh dữ liệu Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.</li>
          </ol>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <input type="checkbox" checked={acceptedPolicy} onChange={e => setAcceptedPolicy(e.target.checked)} style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--accent)' }} disabled={isPending || isApproved} />
            <span style={{ fontSize: '14px', lineHeight: 1.5 }}>
              Tôi cam kết các thông tin và tài liệu định danh cung cấp là hoàn toàn chính xác, chịu trách nhiệm trước pháp luật và đồng ý với <strong style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Quy chế hoạt động Người bán Cún-shop</strong>.
            </span>
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
            <FiAlertCircle /> Thời gian xét duyệt hồ sơ thông thường: <strong>4 - 24 giờ làm việc</strong>
          </div>
          
          <div style={{ display: 'flex', gap: '16px' }}>
            <button type="button" className="btn-secondary" disabled style={{ padding: '14px 24px', borderRadius: '12px' }}>
              Lưu bản nháp
            </button>
            <button type="submit" disabled={saving || isPending || isApproved} className="btn-primary" style={{ padding: '14px 32px', borderRadius: '12px', fontSize: '15px', fontWeight: 700, boxShadow: '0 10px 25px rgba(249, 115, 22, 0.4)' }}>
              {saving ? 'Đang tải lên...' : isApproved ? 'Đã duyệt' : isPending ? 'Đang chờ duyệt' : isRejected ? 'Gửi lại hồ sơ' : 'Gửi hồ sơ duyệt ngay'}
            </button>
          </div>
        </div>

      </form>
      
      <style dangerouslySetInnerHTML={{__html: `
        .input-group { position: relative; }
        .input-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-muted); z-index: 2; }
        .with-icon { padding-left: 44px !important; }
      `}} />
    </div>
  );
}

function StepBadge({ number, title, active }: { number: number, title: string, active: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: active ? 1 : 0.5, whiteSpace: 'nowrap' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: active ? 'var(--accent)' : 'rgba(255,255,255,0.1)', color: active ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700 }}>
        {number}
      </div>
      <span style={{ fontSize: '14px', fontWeight: active ? 700 : 500, color: active ? '#fff' : 'var(--text-muted)' }}>{title}</span>
    </div>
  );
}

function SectionTitle({ number, title }: { number: string, title: string }) {
  return (
    <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '18px', fontWeight: 700, margin: '0 0 24px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
      <div style={{ width: '4px', height: '24px', background: 'var(--accent)', borderRadius: '4px' }} />
      <span style={{ color: 'var(--accent)' }}>{number}.</span> {title}
    </h2>
  );
}

function Label({ text, required }: { text: string, required?: boolean }) {
  return (
    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>
      {text} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
  );
}