'use client'

import { useState } from 'react'
import { InsidenTindakan, StatusTindakan, STATUS_TINDAKAN_LABELS } from '@/types'
import { FiCalendar, FiUser, FiCheck, FiTrash2, FiEdit2, FiX } from 'react-icons/fi'

interface Props {
  tindakan: InsidenTindakan & { pic_nama?: string | null }
  canManage: boolean
  onStatusChange: (id: string, status: StatusTindakan, catatan?: string) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

const STATUS_CONFIG: Record<StatusTindakan, { bg: string; text: string; border: string }> = {
  belum_dimulai: { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' },
  dalam_proses:  { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  selesai:       { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
  batal:         { bg: '#f3f4f6', text: '#9ca3af', border: '#e5e7eb' },
}

const NEXT_STATUS: Partial<Record<StatusTindakan, StatusTindakan>> = {
  belum_dimulai: 'dalam_proses',
  dalam_proses:  'selesai',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isOverdue(target?: string | null, status?: StatusTindakan) {
  if (!target || status === 'selesai' || status === 'batal') return false
  return new Date(target) < new Date()
}

export default function TindakanCard({ tindakan, canManage, onStatusChange, onDelete }: Props) {
  const [loading,  setLoading]  = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [note,     setNote]     = useState('')

  const cfg      = STATUS_CONFIG[tindakan.status]
  const nextStat = NEXT_STATUS[tindakan.status]
  const overdue  = isOverdue(tindakan.target_selesai, tindakan.status)

  const handleAdvance = async () => {
    if (!nextStat) return
    if (nextStat === 'selesai') { setShowNote(true); return }
    setLoading(true)
    await onStatusChange(tindakan.id, nextStat)
    setLoading(false)
  }

  const handleComplete = async () => {
    setLoading(true)
    setShowNote(false)
    await onStatusChange(tindakan.id, 'selesai', note || undefined)
    setLoading(false)
    setNote('')
  }

  const handleDelete = async () => {
    if (!onDelete) return
    setDeleting(true)
    await onDelete(tindakan.id)
    setDeleting(false)
  }

  return (
    <div
      className="rounded p-3 mb-3"
      style={{
        border: `1px solid ${cfg.border}`,
        background: tindakan.status === 'batal' ? '#fafafa' : '#fff',
        opacity: tindakan.status === 'batal' ? 0.6 : 1,
      }}
    >
      {/* Header row */}
      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span
            className="badge"
            style={{
              fontSize: '0.6rem',
              background: tindakan.jenis === 'korektif' ? '#1d4ed8' : '#7c3aed',
              color: '#fff',
            }}
          >
            {tindakan.jenis === 'korektif' ? 'Korektif' : 'Preventif'}
          </span>
          <span
            className="rounded px-2 py-0"
            style={{
              fontSize: '0.65rem',
              fontWeight: 600,
              background: cfg.bg,
              color: cfg.text,
              border: `1px solid ${cfg.border}`,
            }}
          >
            {STATUS_TINDAKAN_LABELS[tindakan.status]}
          </span>
          {overdue && (
            <span className="badge bg-danger" style={{ fontSize: '0.6rem' }}>Terlambat</span>
          )}
        </div>
        {canManage && tindakan.status !== 'selesai' && tindakan.status !== 'batal' && (
          <div className="d-flex gap-1 flex-shrink-0">
            {nextStat && (
              <button
                className="btn btn-sm btn-success d-flex align-items-center gap-1"
                style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                onClick={handleAdvance}
                disabled={loading}
              >
                {loading
                  ? <span className="spinner-border spinner-border-sm" />
                  : <><FiCheck size={12} />{nextStat === 'selesai' ? 'Selesai' : 'Mulai'}</>
                }
              </button>
            )}
            {onDelete && (
              <button
                className="btn btn-sm btn-outline-danger d-flex align-items-center"
                style={{ fontSize: '0.72rem', padding: '2px 6px' }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <span className="spinner-border spinner-border-sm" /> : <FiTrash2 size={12} />}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      <p className="mb-2" style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
        {tindakan.deskripsi}
      </p>

      {/* Meta */}
      <div className="d-flex flex-wrap gap-3" style={{ fontSize: '0.72rem', color: '#6b7280' }}>
        {(tindakan.pic_nama || tindakan.penanggung_jawab_id) && (
          <span className="d-flex align-items-center gap-1">
            <FiUser size={10} />
            {tindakan.pic_nama || 'PIC Ditugaskan'}
          </span>
        )}
        {tindakan.target_selesai && (
          <span className={`d-flex align-items-center gap-1 ${overdue ? 'text-danger fw-semibold' : ''}`}>
            <FiCalendar size={10} />
            Target: {formatDate(tindakan.target_selesai)}
          </span>
        )}
        {tindakan.tanggal_selesai && (
          <span className="d-flex align-items-center gap-1 text-success">
            <FiCheck size={10} />
            Selesai: {formatDate(tindakan.tanggal_selesai)}
          </span>
        )}
      </div>

      {/* Completion note */}
      {tindakan.catatan_penyelesaian && (
        <div
          className="mt-2 px-2 py-1 rounded"
          style={{ fontSize: '0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}
        >
          <FiEdit2 size={10} className="me-1" />
          {tindakan.catatan_penyelesaian}
        </div>
      )}

      {/* Completion note input */}
      {showNote && (
        <div className="mt-2 p-2 rounded" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <label className="form-label small mb-1">Catatan penyelesaian (opsional)</label>
          <textarea
            className="form-control form-control-sm mb-2"
            rows={2}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Jelaskan apa yang telah dilakukan..."
          />
          <div className="d-flex gap-2">
            <button className="btn btn-sm btn-success" onClick={handleComplete} disabled={loading}>
              <FiCheck size={12} className="me-1" />Konfirmasi Selesai
            </button>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowNote(false)}>
              <FiX size={12} className="me-1" />Batal
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
