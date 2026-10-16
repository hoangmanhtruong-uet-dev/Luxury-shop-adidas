'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatPrice } from '@/lib/utils';
import { multiplyMoneyByQuantity } from '@/lib/utils/client-money';
import { useToastStore } from '@/components/ui/Toast';
import { FiSearch, FiChevronDown, FiFilter, FiMessageSquare, FiTruck, FiClock, FiStar, FiChevronLeft, FiChevronRight, FiCheckCircle } from 'react-icons/fi';
import SafeImage from '@/components/common/SafeImage';

interface OrderItemData {
  id: string;
  quantity: number;
  price: string;
  product: { name: string; emoji: string; gradient: string; thumbnail?: string };
}

interface OrderData {
  id: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  shippingAddress: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  total: string;
  trackingNumber?: string | null;
  shippingProvider?: string | null;
  createdAt: string;
  orderItems: OrderItemData[];
}

const statusInfo: Record<string, { label: string; color: string }> = {
  pending: { label: 'CHỜ THANH TOÁN', color: '#fbbf24' },
  paid: { label: 'ĐÃ THANH TOÁN', color: '#22c55e' },
  confirmed: { label: 'ĐÃ XÁC NHẬN', color: '#3b82f6' },
  packing: { label: 'ĐANG ĐÓNG GÓI', color: '#60a5fa' },
  processing: { label: 'ĐANG XỬ LÝ', color: '#60a5fa' },
  shipping: { label: 'ĐANG VẬN CHUYỂN', color: '#0ea5e9' },
  shipped: { label: 'ĐANG GIAO HÀNG', color: '#a855f7' },
  delivered: { label: 'ĐÃ GIAO THÀNH CÔNG', color: '#10b981' },
  cancelled: { label: 'ĐÃ HỦY', color: '#ef4444' },
  expired: { label: 'ĐÃ HẾT HẠN', color: '#64748b' },
  payment_failed: { label: 'THANH TOÁN THẤT BẠI', color: '#ef4444' },
  payment_review: { label: 'ĐANG KIỂM TRA TT', color: '#f97316' },
  return_requested: { label: 'YÊU CẦU TRẢ HÀNG', color: '#f97316' },
  return_approved: { label: 'ĐÃ DUYỆT TRẢ HÀNG', color: '#22c55e' },
  return_rejected: { label: 'TỪ CHỐI TRẢ HÀNG', color: '#ef4444' },
  returning: { label: 'ĐANG HOÀN HÀNG', color: '#a855f7' },
  returned: { label: 'ĐÃ HOÀN HÀNG', color: '#64748b' },
  refund_pending: { label: 'ĐANG HOÀN TIỀN', color: '#f97316' },
  refunded: { label: 'ĐÃ HOÀN TẤT', color: '#10b981' },
};

function getStatusInfo(status: string) {
  return statusInfo[status] || { label: status.toUpperCase(), color: 'var(--text-muted)' };
}

export default function UserOrdersPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const addToast = useToastStore(state => state.addToast);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/me/orders');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể tải đơn hàng');
      setOrders(Array.isArray(data) ? data : []);
    } catch (caught) {
      addToast(caught instanceof Error ? caught.message : 'Không thể tải đơn hàng', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const postOrderAction = async (orderId: string, action: 'cancel' | 'returns' | 'confirm', body?: object) => {
    setBusyOrderId(orderId);
    try {
      // In real app, /confirm would be implemented. Here we reuse returns/cancel logic for demo.
      const response = await fetch(`/api/orders/${orderId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json();
      if (!response.ok && action !== 'confirm') throw new Error(data.error?.message || data.error || 'Không thể cập nhật đơn hàng');
      
      if (action === 'cancel') addToast('Đã hủy đơn hàng.');
      else if (action === 'returns') addToast('Đã gửi yêu cầu trả hàng.');
      else addToast('Cảm ơn bạn đã xác nhận nhận hàng! 🚀');
      
      await fetchOrders();
    } catch (caught) {
      // Ignore confirm errors for mock UI
      if (action !== 'confirm') addToast(caught instanceof Error ? caught.message : 'Không thể cập nhật đơn hàng', 'error');
    } finally {
      setBusyOrderId('');
    }
  };

  // Stats calculation
  const totalSpent = orders.filter(o => ['delivered', 'refunded', 'returned', 'paid'].includes(o.status)).reduce((acc, cur) => acc + Number(cur.total), 0);
  const earnedCoins = Math.floor(totalSpent / 100000) * 10; // Mock calculation
  
  const tabs = [
    { id: 'all', label: 'Tất cả', count: orders.length },
    { id: 'pending', label: 'Chờ thanh toán', count: orders.filter(o => o.status === 'pending').length },
    { id: 'shipping', label: 'Đang vận chuyển', count: orders.filter(o => ['shipping', 'packing', 'processing', 'shipped'].includes(o.status)).length },
    { id: 'delivered', label: 'Đã giao', count: orders.filter(o => ['delivered', 'returned', 'refunded'].includes(o.status)).length },
    { id: 'cancelled', label: 'Đã hủy', count: orders.filter(o => o.status === 'cancelled').length },
  ];

  const filteredOrders = activeTab === 'all' ? orders : 
    activeTab === 'shipping' ? orders.filter(o => ['shipping', 'packing', 'processing', 'shipped'].includes(o.status)) :
    activeTab === 'delivered' ? orders.filter(o => ['delivered', 'returned', 'refunded'].includes(o.status)) :
    orders.filter(o => o.status === activeTab);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* Header Card */}
      <div className="glass-card" style={{ padding: '24px 32px', borderRadius: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Đơn Hàng Của Tôi</h1>
          <span style={{ background: 'rgba(249, 115, 22, 0.1)', color: 'var(--accent)', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
            {orders.length} giao dịch
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 13, fontWeight: 600 }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '10px 16px', borderRadius: 12 }}>
            <span style={{ color: 'var(--text-muted)', marginRight: 8 }}>Chi tiêu tháng này:</span>
            <span style={{ color: '#fff', fontSize: 15 }}>{formatPrice(totalSpent)}</span>
          </div>
          <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '10px 16px', borderRadius: 12 }}>
            <span style={{ color: 'var(--text-muted)', marginRight: 8 }}>Điểm tích lũy:</span>
            <span style={{ color: '#10b981', fontSize: 15 }}>+{earnedCoins} Xu</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 16, overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: activeTab === tab.id ? 'var(--accent)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--text-muted)',
              border: 'none', padding: '8px 20px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', whiteSpace: 'nowrap'
            }}
          >
            {tab.label} {tab.count > 0 && <span style={{ background: activeTab === tab.id ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)', color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.8)', padding: '2px 6px', borderRadius: 10, fontSize: 10 }}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <FiSearch style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
          <input 
            className="input-field" 
            placeholder="Tìm theo Mã đơn hàng, Tên thiết bị, hoặc Thương hiệu..." 
            style={{ width: '100%', padding: '12px 16px 12px 44px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12 }} 
          />
        </div>
        <button className="btn-secondary" style={{ padding: '10px 20px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          Tất cả thời gian <FiChevronDown />
        </button>
        <button className="btn-secondary" style={{ padding: '10px 20px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          Mới nhất trước <FiFilter />
        </button>
      </div>

      {/* Orders List */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải danh sách đơn hàng...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="glass-card" style={{ padding: 60, textAlign: 'center', borderRadius: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>📦</div>
          <h3 style={{ margin: '0 0 8px 0' }}>Không tìm thấy đơn hàng</h3>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Bạn chưa có đơn hàng nào trong trạng thái này.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {filteredOrders.map(order => {
            const status = getStatusInfo(order.status);
            
            // Cún-shop là nhà bán duy nhất — không dựng "shop" giả theo tên sản phẩm.
            const storeType = 'CHÍNH HÃNG';
            const storeName = 'Cún-shop – Giày đá bóng chính hãng';
            const storeColor = '#f97316';

            return (
              <article key={order.id} className="glass-card" style={{ padding: 24, borderRadius: 20, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
                
                {/* Store Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ background: storeColor, color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>{storeType}</span>
                    <strong style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>{storeName} <FiCheckCircle color="#3b82f6" size={14} /></strong>
                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                    <button style={{ background: 'transparent', border: 'none', color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      <FiMessageSquare /> Chat ngay
                    </button>
                  </div>
                  <div style={{ color: status.color, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {order.status === 'delivered' ? <FiCheckCircle /> : <FiClock />} {status.label}
                  </div>
                </div>

                {/* Delivery Status Row (Mocked if shipping) */}
                {['shipping', 'shipped', 'packing', 'processing'].includes(order.status) && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)', padding: '12px 16px', borderRadius: 12, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                      <FiTruck color="#10b981" size={18} />
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>Đơn vị vận chuyển: <strong style={{ color: '#fff' }}>{order.shippingProvider || 'SPX Express'}</strong></span>
                      <span style={{ color: 'rgba(255,255,255,0.3)' }}>-</span>
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>Mã vận đơn: <strong style={{ color: '#0ea5e9' }}>{order.trackingNumber || `SPXVN09${order.id.slice(-5)}`}</strong></span>
                    </div>
                    <div style={{ fontSize: 12, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FiClock /> Dự kiến giao: Hôm nay, 16:30
                    </div>
                  </div>
                )}

                {/* Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                  {order.orderItems.map((item, idx) => (
                    <div key={item.id} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      {/* Product Image Mock */}
                      <div style={{ width: 80, height: 80, borderRadius: 12, background: item.product.gradient || 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {item.product.emoji}
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>{item.product.name}</h4>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: 12 }}>{formatPrice(Number(item.price) * 1.2)}</div>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>{formatPrice(item.price)}</div>
                          </div>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>Phân loại: Mặc định &nbsp;&nbsp;&nbsp;x{item.quantity}</div>
                        
                        {/* Fake Perks */}
                        {idx === 0 && (
                          <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, color: '#10b981' }}>
                            <FiCheckCircle size={14} /> Đổi trả miễn phí 7 ngày
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 20, flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Mã đơn: <strong style={{ color: 'rgba(255,255,255,0.8)' }}>#ORD-2026-{order.id.slice(-5).toUpperCase()}</strong> ({order.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'} lúc {new Date(order.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}, {new Date(order.createdAt).toLocaleDateString('vi-VN')})</div>
                    <div style={{ fontSize: 14 }}>Tổng số tiền ({order.orderItems.reduce((acc, i) => acc + i.quantity, 0)} sản phẩm): <strong style={{ color: 'var(--accent)', fontSize: 18, marginLeft: 4 }}>{formatPrice(order.total)}</strong></div>
                    {order.paymentMethod === 'VNPAY' && <div style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}><FiCheckCircle /> Đã thanh toán VNPay</div>}
                  </div>
                  
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn-secondary" style={{ padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Xem hành trình</button>
                    
                    {order.status === 'pending' && (
                      <button className="btn-secondary" style={{ padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#ef4444' }} onClick={() => { if (window.confirm('Hủy đơn hàng?')) postOrderAction(order.id, 'cancel'); }}>Hủy đơn</button>
                    )}
                    
                    {['shipping', 'shipped'].includes(order.status) && (
                      <button className="btn-primary" style={{ padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600 }} onClick={() => postOrderAction(order.id, 'confirm')}>✓ Đã nhận được hàng</button>
                    )}

                    {['delivered', 'refunded'].includes(order.status) && (
                      <>
                        <button className="btn-secondary" style={{ padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}><FiStar /> Đánh giá (Nhận 200 Xu)</button>
                        <button className="btn-primary" style={{ padding: '10px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Mua lại</button>
                      </>
                    )}
                  </div>
                </div>

              </article>
            );
          })}

          {/* Pagination Mock */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Hiển thị <strong>1-3</strong> trong tổng số <strong>{filteredOrders.length}</strong> đơn hàng</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, borderRadius: 8, opacity: 0.5 }}><FiChevronLeft /></button>
              <button className="btn-primary" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, borderRadius: 8 }}>1</button>
              <button className="btn-secondary" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, borderRadius: 8 }}>2</button>
              <button className="btn-secondary" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, borderRadius: 8 }}><FiChevronRight /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}