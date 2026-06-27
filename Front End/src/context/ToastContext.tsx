import { createContext, useContext, useState, useCallback, useRef } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICONS: Record<ToastType, string> = {
  success: 'fas fa-check-circle',
  error:   'fas fa-times-circle',
  warning: 'fas fa-exclamation-triangle',
  info:    'fas fa-info-circle',
}

const COLORS: Record<ToastType, string> = {
  success: '#28a745',
  error:   '#dc3545',
  warning: '#ffc107',
  info:    '#17a2b8',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++counter.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const dismiss = (id: number) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed',
        top: 70,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minWidth: 300,
        maxWidth: 400,
      }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: '#fff',
              borderLeft: `5px solid ${COLORS[toast.type]}`,
              borderRadius: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              padding: '12px 16px',
              animation: 'slideIn 0.25s ease',
            }}
          >
            <i className={ICONS[toast.type]} style={{ color: COLORS[toast.type], fontSize: 18, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 14, color: '#333' }}>{toast.message}</span>
            <button
              onClick={() => dismiss(toast.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: 16, lineHeight: 1, padding: 0 }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <style>{`@keyframes slideIn { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }`}</style>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
