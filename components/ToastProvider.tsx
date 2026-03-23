'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { FiCheckCircle, FiAlertTriangle, FiXCircle, FiInfo, FiX } from 'react-icons/fi'

interface ToastItem {
  id: number
  message: string
  variant: 'success' | 'error' | 'warning' | 'info'
}

interface ToastContextType {
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

let toastId = 0

const ICONS = {
  success: FiCheckCircle,
  error: FiXCircle,
  warning: FiAlertTriangle,
  info: FiInfo,
}

const COLORS = {
  success: { bg: 'rgba(28,200,138,0.12)', border: '#1cc88a', text: '#0d7a5f', icon: '#1cc88a' },
  error: { bg: 'rgba(231,74,59,0.12)', border: '#e74a3b', text: '#c53030', icon: '#e74a3b' },
  warning: { bg: 'rgba(246,194,62,0.12)', border: '#f6c23e', text: '#b7791f', icon: '#f6c23e' },
  info: { bg: 'rgba(78,115,223,0.12)', border: '#4e73df', text: '#2d4a8a', icon: '#4e73df' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((message: string, variant: ToastItem['variant']) => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, variant }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const remove = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast: ToastContextType = {
    success: useCallback((msg: string) => addToast(msg, 'success'), [addToast]),
    error: useCallback((msg: string) => addToast(msg, 'error'), [addToast]),
    warning: useCallback((msg: string) => addToast(msg, 'warning'), [addToast]),
    info: useCallback((msg: string) => addToast(msg, 'info'), [addToast]),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Toast Container */}
      <div
        style={{
          position: 'fixed',
          top: '72px',
          right: '16px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxWidth: '380px',
          width: '100%',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.variant]
          const color = COLORS[t.variant]
          return (
            <div
              key={t.id}
              className="toast-slide-in"
              style={{
                pointerEvents: 'auto',
                background: '#fff',
                borderLeft: `4px solid ${color.border}`,
                borderRadius: '0.5rem',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                animation: 'toastSlideIn 0.3s ease-out',
              }}
            >
              <Icon size={18} style={{ color: color.icon, flexShrink: 0, marginTop: '1px' }} />
              <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-heading)', lineHeight: 1.4 }}>
                {t.message}
              </span>
              <button
                onClick={() => remove(t.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0',
                  color: 'var(--text-body)',
                  opacity: 0.5,
                  flexShrink: 0,
                }}
              >
                <FiX size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
