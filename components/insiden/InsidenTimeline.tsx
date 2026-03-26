import { InsidenTimeline as TimelineItem, STATUS_INSIDEN_LABELS } from '@/types'
import { FiClock, FiSearch, FiTool, FiCheckCircle, FiXCircle, FiAlertTriangle } from 'react-icons/fi'

interface Props {
  timeline: (TimelineItem & { pembuat_nama?: string | null })[]
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  dilaporkan:        <FiAlertTriangle size={12} />,
  dalam_investigasi: <FiSearch size={12} />,
  menunggu_tindakan: <FiTool size={12} />,
  selesai:           <FiCheckCircle size={12} />,
  ditutup:           <FiXCircle size={12} />,
}

const STATUS_COLOR: Record<string, string> = {
  dilaporkan:        '#6b7280',
  dalam_investigasi: '#d97706',
  menunggu_tindakan: '#0ea5e9',
  selesai:           '#059669',
  ditutup:           '#374151',
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function InsidenTimeline({ timeline }: Props) {
  if (timeline.length === 0) {
    return (
      <div className="text-center py-3">
        <FiClock size={24} className="text-muted mb-2" />
        <p className="text-muted small mb-0">Belum ada aktivitas</p>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Vertical connector line */}
      {timeline.length > 1 && (
        <div
          style={{
            position: 'absolute',
            left: 11,
            top: 12,
            bottom: 12,
            width: 2,
            backgroundColor: '#e5e7eb',
          }}
        />
      )}

      {timeline.map((item, i) => {
        const color = STATUS_COLOR[item.status_baru] || '#6b7280'
        const icon  = STATUS_ICON[item.status_baru]  || <FiClock size={12} />
        const isLast = i === timeline.length - 1

        return (
          <div key={item.id} className="d-flex mb-3" style={{ position: 'relative' }}>
            {/* Dot */}
            <div
              className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 text-white"
              style={{
                width: 24,
                height: 24,
                backgroundColor: isLast ? color : '#e5e7eb',
                color: isLast ? '#fff' : color,
                border: isLast ? 'none' : `2px solid ${color}`,
                zIndex: 1,
              }}
            >
              {icon}
            </div>

            {/* Content */}
            <div className="ms-3 flex-grow-1">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span className="fw-semibold" style={{ fontSize: '0.82rem', color }}>
                  {STATUS_INSIDEN_LABELS[item.status_baru as keyof typeof STATUS_INSIDEN_LABELS] || item.status_baru}
                </span>
                {item.status_lama && (
                  <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                    ← {STATUS_INSIDEN_LABELS[item.status_lama as keyof typeof STATUS_INSIDEN_LABELS] || item.status_lama}
                  </span>
                )}
              </div>
              {item.pembuat_nama && (
                <div className="text-muted" style={{ fontSize: '0.72rem' }}>{item.pembuat_nama}</div>
              )}
              {item.catatan && (
                <div
                  className="mt-1 px-2 py-1 rounded"
                  style={{
                    fontSize: '0.75rem',
                    background: '#f9fafb',
                    border: '1px solid #f3f4f6',
                    color: '#374151',
                    fontStyle: 'italic',
                  }}
                >
                  {item.catatan}
                </div>
              )}
              <div className="text-muted mt-1" style={{ fontSize: '0.68rem' }}>
                <FiClock size={9} className="me-1" />
                {formatDateTime(item.created_at)}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
