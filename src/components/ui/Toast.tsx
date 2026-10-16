'use client';
import Link from 'next/link';
import { create } from 'zustand';

interface ToastAction { label: string; href: string; }
interface Toast { id: number; message: string; type: 'success' | 'error' | 'info'; action?: ToastAction; }
interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type'], action?: ToastAction) => void;
  removeToast: (id: number) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = 'success', action) => {
    const id = Date.now() + Math.random();
    // Compact: keep max 3 visible, drop oldest.
    set(s => ({ toasts: [...s.toasts.slice(-2), { id, message, type, action }] }));
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 2800);
  },
  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}));

export default function ToastContainer() {
  const toasts = useToastStore(s => s.toasts);
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">{t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}</span>
          <span className="toast-message">{t.message}</span>
          {t.action && (
            <Link href={t.action.href} className="toast-action">
              {t.action.label}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
