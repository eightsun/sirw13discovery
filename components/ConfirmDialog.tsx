'use client'

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import Modal from 'react-bootstrap/Modal'
import { FiAlertTriangle } from 'react-icons/fi'

interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'primary'
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions>({
    message: '',
    title: 'Konfirmasi',
    confirmLabel: 'Ya',
    cancelLabel: 'Batal',
    variant: 'danger',
  })
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm: ConfirmFn = useCallback((opts) => {
    setOptions({
      title: opts.title || 'Konfirmasi',
      message: opts.message,
      confirmLabel: opts.confirmLabel || 'Ya',
      cancelLabel: opts.cancelLabel || 'Batal',
      variant: opts.variant || 'danger',
    })
    setShow(true)
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  const handleClose = (result: boolean) => {
    setShow(false)
    resolveRef.current?.(result)
    resolveRef.current = null
  }

  const variantColors = {
    danger: { icon: '#e74a3b', btn: 'btn-danger' },
    warning: { icon: '#f6c23e', btn: 'btn-warning' },
    primary: { icon: '#4e73df', btn: 'btn-primary' },
  }

  const color = variantColors[options.variant || 'danger']

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      <Modal
        show={show}
        onHide={() => handleClose(false)}
        centered
        size="sm"
        backdrop="static"
      >
        <Modal.Body className="text-center py-4">
          <div
            className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle"
            style={{
              width: '56px',
              height: '56px',
              background: `${color.icon}15`,
            }}
          >
            <FiAlertTriangle size={28} style={{ color: color.icon }} />
          </div>
          <h6 className="fw-bold mb-2" style={{ color: 'var(--text-heading)' }}>
            {options.title}
          </h6>
          <p className="mb-0" style={{ fontSize: '0.875rem', color: 'var(--text-body)' }}>
            {options.message}
          </p>
        </Modal.Body>
        <Modal.Footer className="border-top justify-content-center gap-2 py-3">
          <button
            className="btn btn-outline-secondary btn-sm px-3"
            onClick={() => handleClose(false)}
            style={{ minWidth: '80px' }}
          >
            {options.cancelLabel}
          </button>
          <button
            className={`btn ${color.btn} btn-sm px-3`}
            onClick={() => handleClose(true)}
            style={{ minWidth: '80px' }}
          >
            {options.confirmLabel}
          </button>
        </Modal.Footer>
      </Modal>
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx
}
