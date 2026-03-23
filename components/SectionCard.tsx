'use client'

import { ReactNode } from 'react'

interface SectionCardProps {
  title: string
  icon?: ReactNode
  action?: ReactNode
  accent?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  children: ReactNode
  className?: string
  bodyClassName?: string
  noPadding?: boolean
}

const ACCENT_COLORS: Record<string, string> = {
  primary: 'var(--primary-color)',
  success: 'var(--success-color)',
  warning: 'var(--warning-color)',
  danger: 'var(--danger-color)',
  info: 'var(--info-color)',
}

export default function SectionCard({
  title,
  icon,
  action,
  accent,
  children,
  className = '',
  bodyClassName = '',
  noPadding = false,
}: SectionCardProps) {
  return (
    <div
      className={`card ${className}`}
      style={accent ? { borderTop: `3px solid ${ACCENT_COLORS[accent]}` } : undefined}
    >
      <div className="card-header d-flex justify-content-between align-items-center">
        <h6 className="m-0 fw-bold d-flex align-items-center gap-2" style={{ color: 'var(--text-heading)' }}>
          {icon && <span style={{ color: accent ? ACCENT_COLORS[accent] : 'var(--text-body)', display: 'flex' }}>{icon}</span>}
          {title}
        </h6>
        {action && <div>{action}</div>}
      </div>
      <div className={noPadding ? 'p-0' : `card-body ${bodyClassName}`}>
        {children}
      </div>
    </div>
  )
}
