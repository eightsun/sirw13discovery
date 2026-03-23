'use client'

import { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-5">
      <div
        className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle"
        style={{
          width: '72px',
          height: '72px',
          background: 'var(--light-color)',
          color: 'var(--text-body)',
          opacity: 0.6,
        }}
      >
        {icon}
      </div>
      <h6 className="fw-bold mb-1" style={{ color: 'var(--text-heading)' }}>
        {title}
      </h6>
      {description && (
        <p className="text-muted small mb-3" style={{ maxWidth: '320px', margin: '0 auto' }}>
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
