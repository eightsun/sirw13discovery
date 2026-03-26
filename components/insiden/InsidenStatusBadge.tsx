import { StatusInsiden } from '@/types'
import { FiClock, FiSearch, FiTool, FiCheckCircle, FiXCircle } from 'react-icons/fi'

interface Props {
  status: StatusInsiden
  size?: 'sm' | 'md'
}

const CONFIG: Record<StatusInsiden, { label: string; bg: string; icon: React.ReactNode }> = {
  dilaporkan:        { label: 'Dilaporkan',         bg: 'bg-secondary',           icon: <FiClock size={10} /> },
  dalam_investigasi: { label: 'Investigasi',         bg: 'bg-warning text-dark',   icon: <FiSearch size={10} /> },
  menunggu_tindakan: { label: 'Menunggu Tindakan',   bg: 'bg-info',                icon: <FiTool size={10} /> },
  selesai:           { label: 'Selesai',             bg: 'bg-success',             icon: <FiCheckCircle size={10} /> },
  ditutup:           { label: 'Ditutup',             bg: 'bg-dark',                icon: <FiXCircle size={10} /> },
}

export default function InsidenStatusBadge({ status, size = 'sm' }: Props) {
  const cfg = CONFIG[status] ?? CONFIG.dilaporkan
  const fontSize = size === 'sm' ? '0.65rem' : '0.75rem'
  return (
    <span className={`badge ${cfg.bg} d-inline-flex align-items-center gap-1`} style={{ fontSize }}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}
