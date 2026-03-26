import { TingkatKeparahan } from '@/types'
import { FiAlertCircle } from 'react-icons/fi'

interface Props {
  tingkat: TingkatKeparahan
  size?: 'sm' | 'md'
  showIcon?: boolean
}

const CONFIG: Record<TingkatKeparahan, { label: string; bg: string; border: string }> = {
  rendah:  { label: 'Rendah',  bg: '#d1fae5', border: '#059669' },
  sedang:  { label: 'Sedang',  bg: '#fef3c7', border: '#d97706' },
  tinggi:  { label: 'Tinggi',  bg: '#fee2e2', border: '#dc2626' },
  kritis:  { label: 'KRITIS',  bg: '#1e1e2e', border: '#dc2626' },
}

const TEXT_COLOR: Record<TingkatKeparahan, string> = {
  rendah: '#065f46',
  sedang: '#92400e',
  tinggi: '#991b1b',
  kritis: '#fca5a5',
}

export default function TingkatKeparahanBadge({ tingkat, size = 'sm', showIcon = false }: Props) {
  const cfg   = CONFIG[tingkat] ?? CONFIG.rendah
  const color = TEXT_COLOR[tingkat]
  const fontSize = size === 'sm' ? '0.65rem' : '0.75rem'
  const fontWeight = tingkat === 'kritis' ? 700 : 600

  return (
    <span
      className="d-inline-flex align-items-center gap-1 rounded px-2 py-1"
      style={{
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color,
        fontSize,
        fontWeight,
      }}
    >
      {showIcon && <FiAlertCircle size={10} />}
      {cfg.label}
    </span>
  )
}
