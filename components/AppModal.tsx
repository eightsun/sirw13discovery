'use client'

import { ReactNode } from 'react'
import Modal from 'react-bootstrap/Modal'

interface AppModalProps {
  show: boolean
  onHide: () => void
  title: string
  icon?: ReactNode
  size?: 'sm' | 'lg' | 'xl'
  children: ReactNode
  footer?: ReactNode
  disabled?: boolean
}

export default function AppModal({
  show,
  onHide,
  title,
  icon,
  size,
  children,
  footer,
  disabled = false,
}: AppModalProps) {
  return (
    <Modal
      show={show}
      onHide={disabled ? undefined : onHide}
      centered
      size={size}
      backdrop={disabled ? 'static' : true}
    >
      <Modal.Header
        closeButton={!disabled}
        className="border-bottom"
        style={{ padding: '1rem 1.25rem' }}
      >
        <Modal.Title
          className="d-flex align-items-center gap-2 fw-bold"
          style={{ fontSize: '1rem', color: 'var(--text-heading)' }}
        >
          {icon && <span style={{ color: 'var(--primary-color)', display: 'flex' }}>{icon}</span>}
          {title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ padding: '1.25rem' }}>
        {children}
      </Modal.Body>
      {footer && (
        <Modal.Footer className="border-top" style={{ padding: '0.75rem 1.25rem' }}>
          {footer}
        </Modal.Footer>
      )}
    </Modal>
  )
}
