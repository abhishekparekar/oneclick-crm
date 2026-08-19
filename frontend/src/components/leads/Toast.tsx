import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms — 0 = sticky
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

// ── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

interface ConfirmState extends ConfirmOptions {
  resolve: (val: boolean) => void;
}

function ConfirmDialog({ state, onDone }: { state: ConfirmState; onDone: () => void }) {
  const handleConfirm = () => { state.resolve(true); onDone(); };
  const handleCancel = () => { state.resolve(false); onDone(); };

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={handleCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF', borderRadius: 14,
          padding: '24px 24px 20px',
          width: '100%', maxWidth: 380,
          boxShadow: '0 20px 60px -10px rgba(0,0,0,0.22)',
          border: '1px solid #E5E7EB',
          animation: 'scaleUp 0.16s cubic-bezier(0.16,1,0.3,1) forwards',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: state.danger ? '#FEF2F2' : '#FFFBEB',
          }}>
            <AlertTriangle style={{ width: 18, height: 18, color: state.danger ? '#EF4444' : '#F59E0B' }} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{state.title}</p>
            <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4, lineHeight: 1.5 }}>{state.message}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={handleCancel}
            style={{
              height: 34, padding: '0 14px', borderRadius: 7, fontSize: 13, fontWeight: 500,
              background: '#FFFFFF', color: '#374151', border: '1px solid #E5E7EB',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {state.cancelLabel || 'Cancel'}
          </button>
          <button
            onClick={handleConfirm}
            style={{
              height: 34, padding: '0 14px', borderRadius: 7, fontSize: 13, fontWeight: 500,
              background: state.danger ? '#EF4444' : '#0E6B50',
              color: '#FFFFFF', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {state.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Toast Item ────────────────────────────────────────────────────────────────

const TOAST_STYLES: Record<ToastType, { bg: string; border: string; icon: string; iconColor: string }> = {
  success: { bg: '#F0FDF4', border: '#BBF7D0', icon: 'check', iconColor: '#16A34A' },
  error:   { bg: '#FEF2F2', border: '#FECACA', icon: 'alert', iconColor: '#EF4444' },
  warning: { bg: '#FFFBEB', border: '#FDE68A', icon: 'warn',  iconColor: '#D97706' },
  info:    { bg: '#EFF6FF', border: '#BFDBFE', icon: 'info',  iconColor: '#2563EB' },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const style = TOAST_STYLES[toast.type];
  const Icon = toast.type === 'success' ? CheckCircle
    : toast.type === 'error' ? AlertCircle
    : toast.type === 'warning' ? AlertTriangle
    : Info;

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '12px 14px',
        background: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: 10,
        boxShadow: '0 4px 16px -4px rgba(0,0,0,0.12)',
        minWidth: 280, maxWidth: 360,
        animation: 'toastIn 0.22s cubic-bezier(0.16,1,0.3,1) forwards',
        position: 'relative',
      }}
    >
      <Icon style={{ width: 16, height: 16, color: style.iconColor, flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{toast.title}</p>
        {toast.message && (
          <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0', lineHeight: 1.5 }}>{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          color: '#9CA3AF', flexShrink: 0, marginTop: 1, lineHeight: 1,
        }}
      >
        <X style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const counterRef = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((opts: Omit<Toast, 'id'>) => {
    const id = `toast-${++counterRef.current}`;
    const duration = opts.duration ?? (opts.type === 'error' ? 5000 : 3500);
    setToasts(prev => [...prev, { ...opts, id, duration }]);
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);

  const success = useCallback((title: string, message?: string) => addToast({ type: 'success', title, message }), [addToast]);
  const error   = useCallback((title: string, message?: string) => addToast({ type: 'error', title, message }), [addToast]);
  const info    = useCallback((title: string, message?: string) => addToast({ type: 'info', title, message }), [addToast]);
  const warning = useCallback((title: string, message?: string) => addToast({ type: 'warning', title, message }), [addToast]);

  const showConfirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>(resolve => {
      setConfirm({ ...opts, resolve });
    });
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info, warning, confirm: showConfirm }}>
      {children}

      {/* Confirm dialog */}
      {confirm && (
        <ConfirmDialog state={confirm} onDone={() => setConfirm(null)} />
      )}

      {/* Toast stack — top-right */}
      {createPortal(
        <div
          style={{
            position: 'fixed', top: 16, right: 16, zIndex: 10000,
            display: 'flex', flexDirection: 'column', gap: 8,
            pointerEvents: 'none',
          }}
        >
          {toasts.map(t => (
            <div key={t.id} style={{ pointerEvents: 'auto' }}>
              <ToastItem toast={t} onRemove={removeToast} />
            </div>
          ))}
        </div>,
        document.body
      )}

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(24px) scale(0.97); }
          to   { opacity: 1; transform: translateX(0)    scale(1); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

