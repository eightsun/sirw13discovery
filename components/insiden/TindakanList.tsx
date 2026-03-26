'use client'

import { useState } from 'react'
import { InsidenTindakan, StatusTindakan, JenisTindakan } from '@/types'
import TindakanCard from './TindakanCard'
import { FiPlus, FiX } from 'react-icons/fi'

interface Props {
  insidenId: string
  tindakan: (InsidenTindakan & { pic_nama?: string | null })[]
  canManage: boolean       // officers can add/edit/delete
  canDelete: boolean       // RW officers only
  officerList: { id: string; nama_lengkap: string }[]
  onChange: () => void     // called after any mutation to refetch
}

interface NewForm {
  jenis: JenisTindakan
  deskripsi: string
  penanggung_jawab_id: string
  target_selesai: string
}

const EMPTY_FORM: NewForm = {
  jenis:               'korektif',
  deskripsi:           '',
  penanggung_jawab_id: '',
  target_selesai:      '',
}

export default function TindakanList({ insidenId, tindakan, canManage, canDelete, officerList, onChange }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState<NewForm>(EMPTY_FORM)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  const set = <K extends keyof NewForm>(k: K, v: NewForm[K]) => setForm(f => ({ ...f, [k]: v }))

  const handleAdd = async () => {
    setError('')
    if (!form.deskripsi.trim()) { setError('Deskripsi wajib diisi'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/insiden/${insidenId}/tindakan`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          jenis:               form.jenis,
          deskripsi:           form.deskripsi.trim(),
          penanggung_jawab_id: form.penanggung_jawab_id || null,
          target_selesai:      form.target_selesai       || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setForm(EMPTY_FORM)
      setShowForm(false)
      onChange()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (id: string, status: StatusTindakan, catatan?: string) => {
    await fetch(`/api/insiden/${insidenId}/tindakan/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status, catatan_penyelesaian: catatan }),
    })
    onChange()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/insiden/${insidenId}/tindakan/${id}`, { method: 'DELETE' })
    onChange()
  }

  const korektif  = tindakan.filter(t => t.jenis === 'korektif')
  const preventif = tindakan.filter(t => t.jenis === 'preventif')

  return (
    <div>
      {tindakan.length === 0 && !showForm && (
        <p className="text-muted small text-center py-2">Belum ada tindakan yang ditambahkan</p>
      )}

      {/* Korektif */}
      {korektif.length > 0 && (
        <div className="mb-3">
          <div className="d-flex align-items-center gap-2 mb-2">
            <span className="badge" style={{ background: '#1d4ed8', fontSize: '0.65rem' }}>Korektif</span>
            <small className="text-muted">Mengatasi penyebab insiden yang telah terjadi</small>
          </div>
          {korektif.map(t => (
            <TindakanCard
              key={t.id}
              tindakan={t}
              canManage={canManage}
              onStatusChange={handleStatusChange}
              onDelete={canDelete ? handleDelete : undefined}
            />
          ))}
        </div>
      )}

      {/* Preventif */}
      {preventif.length > 0 && (
        <div className="mb-3">
          <div className="d-flex align-items-center gap-2 mb-2">
            <span className="badge" style={{ background: '#7c3aed', fontSize: '0.65rem' }}>Preventif</span>
            <small className="text-muted">Mencegah insiden serupa terjadi di masa depan</small>
          </div>
          {preventif.map(t => (
            <TindakanCard
              key={t.id}
              tindakan={t}
              canManage={canManage}
              onStatusChange={handleStatusChange}
              onDelete={canDelete ? handleDelete : undefined}
            />
          ))}
        </div>
      )}

      {/* Add form */}
      {canManage && showForm && (
        <div className="card mb-3" style={{ border: '1px dashed #d1d5db', background: '#f9fafb' }}>
          <div className="card-body">
            {error && <div className="alert alert-danger py-2 small">{error}</div>}
            <div className="row g-2 mb-2">
              <div className="col-md-3">
                <label className="form-label small mb-1">Jenis</label>
                <select
                  className="form-select form-select-sm"
                  value={form.jenis}
                  onChange={e => set('jenis', e.target.value as JenisTindakan)}
                >
                  <option value="korektif">Korektif</option>
                  <option value="preventif">Preventif</option>
                </select>
              </div>
              <div className="col-md-5">
                <label className="form-label small mb-1">PIC</label>
                <select
                  className="form-select form-select-sm"
                  value={form.penanggung_jawab_id}
                  onChange={e => set('penanggung_jawab_id', e.target.value)}
                >
                  <option value="">-- Pilih PIC (opsional) --</option>
                  {officerList.map(o => (
                    <option key={o.id} value={o.id}>{o.nama_lengkap}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label small mb-1">Target Selesai</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={form.target_selesai}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => set('target_selesai', e.target.value)}
                />
              </div>
            </div>
            <div className="mb-2">
              <label className="form-label small mb-1">Deskripsi Tindakan <span className="text-danger">*</span></label>
              <textarea
                className="form-control form-control-sm"
                rows={2}
                placeholder="Jelaskan tindakan yang perlu dilakukan..."
                value={form.deskripsi}
                onChange={e => set('deskripsi', e.target.value)}
              />
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-primary" onClick={handleAdd} disabled={saving}>
                {saving ? <span className="spinner-border spinner-border-sm" /> : 'Simpan Tindakan'}
              </button>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setError('') }}>
                <FiX size={12} className="me-1" />Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add button */}
      {canManage && !showForm && (
        <button
          className="btn btn-sm btn-outline-primary w-100 mt-1"
          onClick={() => setShowForm(true)}
        >
          <FiPlus size={14} className="me-1" />Tambah Tindakan
        </button>
      )}
    </div>
  )
}
