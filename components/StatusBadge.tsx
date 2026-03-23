'use client'

interface StatusBadgeProps {
  variant: 'pending' | 'success' | 'danger' | 'info' | 'neutral' | 'warning'
  children: React.ReactNode
  className?: string
}

const STYLES: Record<string, { bg: string; color: string }> = {
  pending: { bg: 'rgba(246,194,62,0.15)', color: '#b7791f' },
  warning: { bg: 'rgba(246,194,62,0.15)', color: '#b7791f' },
  success: { bg: 'rgba(28,200,138,0.15)', color: '#0d7a5f' },
  danger: { bg: 'rgba(231,74,59,0.15)', color: '#c53030' },
  info: { bg: 'rgba(78,115,223,0.15)', color: '#2d4a8a' },
  neutral: { bg: 'rgba(100,116,139,0.12)', color: '#475569' },
}

export default function StatusBadge({ variant, children, className = '' }: StatusBadgeProps) {
  const style = STYLES[variant] || STYLES.neutral

  return (
    <span
      className={`badge ${className}`}
      style={{
        background: style.bg,
        color: style.color,
        fontWeight: 600,
        fontSize: '0.7rem',
        padding: '0.35em 0.65em',
        borderRadius: '0.35rem',
      }}
    >
      {children}
    </span>
  )
}
