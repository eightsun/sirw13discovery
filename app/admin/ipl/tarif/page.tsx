'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { TarifIPL } from '@/types'
import { 
  FiArrowLeft, FiPlus, FiEdit, FiTrash2, FiPlay, 
  FiCalendar, FiCheck, FiLoader 
} from 'react-icons/fi'

export default function TarifIPLPage() {
  const { userData, isRW, loading: userLoading } = useUser()
  const supabase = createClient()
  
  const [tarifList, setTarifList] = useState<TarifIPL[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    blok: 'Semua' as 'Timur' | 'Barat' | 'Semua',
    periode_mulai: '',
    periode_selesai: '',
    tarif_berpenghuni: '',
    tarif_tidak_berpenghuni: '',
    keterangan: '',
  })
  const [submitting, setSubmitting] = useState(false)
  
  // Generate tagihan state
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generateBulan, setGenerateBulan] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generateResult, setGenerateResult] = useState<any>(null)

  const fetchTarif = async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('tarif_ipl')
        .select('*')
        .order('periode_mulai', { ascending: false })

      if (fetchError) throw fetchError
      setTarifList(data || [])
    } catch (err) {
      console.error('Error fetching tarif:', err)
      setError('Gagal memuat data tarif')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!userLoading && isRW) {
      fetchTarif()
    }
  }, [userLoading, isRW])

  const resetForm = () => {
    setFormData({
      blok: 'Semua',
      periode_mulai: '',
      periode_selesai: '',
      tarif_berpenghuni: '',
      tarif_tidak_berpenghuni: '',
      keterangan: '',
    })
    setEditingId(null)
    setShowForm(false)
  }

  const handleEdit = (tarif: TarifIPL) => {
    setFormData({
      blok: tarif.blok,
      periode_mulai: tarif.periode_mulai,
      periode_selesai: tarif.periode_selesai || '',
      tarif_berpenghuni: tarif.tarif_berpenghuni.toString(),
      tarif_tidak_berpenghuni: tarif.tarif_tidak_berpenghuni?.toString() || '',
      keterangan: tarif.keterangan || '',
    })
    setEditingId(tarif.id)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setSubmitting(true)
      setError(null)

      const data = {
        blok: formData.blok,
        periode_mulai: formData.periode_mulai,
        periode_selesai: formData.periode_selesai || null,
        tarif_berpenghuni: parseInt(formData.tarif_berpenghuni),
        tarif_tidak_berpenghuni: formData.tarif_tidak_berpenghuni 
          ? parseInt(formData.tarif_tidak_berpenghuni) 
          : null,
        keterangan: formData.keterangan || null,
        created_by: userData?.id,
      }

      if (editingId) {
        const { error: updateError } = await supabase
          .from('tarif_ipl')
          .update(data)
          .eq('id', editingId)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('tarif_ipl')
          .insert(data)

        if (insertError) throw insertError
      }

      resetForm()
      await fetchTarif()
      
    } catch (err: any) {
      console.error('Submit error:', err)
      setError(err.message || 'Gagal menyimpan tarif')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus tarif ini?')) return
    
    try {
      const { error: deleteError } = await supabase
        .from('tarif_ipl')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      await fetchTarif()
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus tarif')
    }
  }

  const handleGenerateTagihan = async () => {
    if (!generateBulan) {
      alert('Pilih bulan terlebih dahulu')
      return
    }

    try {
      setGenerating(true)
      setGenerateResult(null)

      const response = await fetch('/api/ipl/generate-tagihan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulan: generateBulan }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Generate gagal')
      }

      setGenerateResult(result)

    } catch (err: any) {
      console.error('Generate error:', err)
      alert(err.message || 'Gagal generate tagihan')
    } finally {
      setGenerating(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  // Generate month options for the last 12 months and next 12 months
  const getMonthOptions = () => {
    const options = []
    const now = new Date()
    for (let i = -3; i <= 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const label = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      options.push({ value, label })
    }
    return options
  }

  if (userLoading || loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (!isRW) {
    return (
      <div className="text-center py-5">
        <div className="alert alert-danger">
          Anda tidak memiliki akses ke halaman ini
        </div>
        <Link href="/ipl" className="btn btn-primary">
          Kembali
        </Link>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title mb-0">Pengaturan Tarif IPL</h1>
          <p className="text-muted mb-0">Kelola tarif Iuran Pengelolaan Lingkungan</p>
        </div>
        <div>
          <button 
            className="btn btn-success me-2"
            onClick={() => setShowGenerateModal(true)}
          >
            <FiPlay className="me-2" />
            Generate Tagihan
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            <FiPlus className="me-2" />
            Tambah Tarif
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)} />
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="card mb-4">
          <div className="card-header bg-primary text-white">
            <h6 className="m-0 fw-bold">
              {editingId ? 'Edit Tarif' : 'Tambah Tarif Baru'}
            </h6>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-4 mb-3">
                  <label className="form-label">Blok *</label>
                  <select
                    className="form-select"
                    value={formData.blok}
                    onChange={(e) => setFormData({...formData, blok: e.target.value as any})}
                    required
                  >
                    <option value="Semua">Semua Blok</option>
                    <option value="Timur">Timur</option>
                    <option value="Barat">Barat</option>
                  </select>
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">Periode Mulai *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.periode_mulai}
                    onChange={(e) => setFormData({...formData, periode_mulai: e.target.value})}
                    required
                  />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">Periode Selesai</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.periode_selesai}
                    onChange={(e) => setFormData({...formData, periode_selesai: e.target.value})}
                  />
                  <small className="text-muted">Kosongkan jika masih berlaku</small>
                </div>
              </div>
              <div className="row">
                <div className="col-md-4 mb-3">
                  <label className="form-label">Tarif Berpenghuni *</label>
                  <div className="input-group">
                    <span className="input-group-text">Rp</span>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.tarif_berpenghuni}
                      onChange={(e) => setFormData({...formData, tarif_berpenghuni: e.target.value})}
                      placeholder="100000"
                      required
                    />
                  </div>
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">Tarif Tidak Berpenghuni</label>
                  <div className="input-group">
                    <span className="input-group-text">Rp</span>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.tarif_tidak_berpenghuni}
                      onChange={(e) => setFormData({...formData, tarif_tidak_berpenghuni: e.target.value})}
                      placeholder="50000"
                    />
                  </div>
                  <small className="text-muted">Kosongkan jika sama dengan berpenghuni</small>
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">Keterangan</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.keterangan}
                    onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                    placeholder="Catatan tambahan..."
                  />
                </div>
              </div>
              <div className="d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? (
                    <>
                      <FiLoader className="spin me-2" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <FiCheck className="me-2" />
                      Simpan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="card-header bg-primary text-white">
          <h6 className="m-0 fw-bold">
            <span className="me-2">Rp</span>
            Daftar Tarif IPL
          </h6>
        </div>
        <div className="card-body">
          {tarifList.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <div className="display-1 mb-3">Rp</div>
              <p>Belum ada tarif IPL</p>
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                <FiPlus className="me-2" />
                Tambah Tarif Pertama
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Blok</th>
                    <th>Periode Mulai</th>
                    <th>Periode Selesai</th>
                    <th className="text-end">Tarif Berpenghuni</th>
                    <th className="text-end">Tarif Tidak Berpenghuni</th>
                    <th>Keterangan</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {tarifList.map((tarif) => (
                    <tr key={tarif.id}>
                      <td>
                        <span className={`badge ${
                          tarif.blok === 'Timur' ? 'bg-info' :
                          tarif.blok === 'Barat' ? 'bg-warning text-dark' :
                          'bg-primary'
                        }`}>
                          {tarif.blok}
                        </span>
                      </td>
                      <td>{formatDate(tarif.periode_mulai)}</td>
                      <td>
                        {tarif.periode_selesai ? formatDate(tarif.periode_selesai) : (
                          <span className="badge bg-success">Berlaku</span>
                        )}
                      </td>
                      <td className="text-end">{formatCurrency(tarif.tarif_berpenghuni)}</td>
                      <td className="text-end">
                        {tarif.tarif_tidak_berpenghuni 
                          ? formatCurrency(tarif.tarif_tidak_berpenghuni)
                          : <span className="text-muted">-</span>
                        }
                      </td>
                      <td><small>{tarif.keterangan || '-'}</small></td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-warning"
                            onClick={() => handleEdit(tarif)}
                            title="Edit"
                          >
                            <FiEdit />
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => handleDelete(tarif.id)}
                            title="Hapus"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <FiCalendar className="me-2" />
                  Generate Tagihan Bulanan
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setShowGenerateModal(false)
                    setGenerateResult(null)
                  }}
                />
              </div>
              <div className="modal-body">
                {generateResult ? (
                  <div>
                    <div className="alert alert-success">
                      <FiCheck className="me-2" />
                      {generateResult.message}
                    </div>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td>Total Rumah</td>
                          <td><strong>{generateResult.summary.total_rumah}</strong></td>
                        </tr>
                        <tr>
                          <td>Tagihan Dibuat</td>
                          <td><strong className="text-success">{generateResult.summary.inserted}</strong></td>
                        </tr>
                        <tr>
                          <td>Dilewati (sudah ada)</td>
                          <td><strong className="text-muted">{generateResult.summary.skipped}</strong></td>
                        </tr>
                        <tr>
                          <td>Tanpa Tarif</td>
                          <td><strong className="text-warning">{generateResult.summary.no_tarif}</strong></td>
                        </tr>
                      </tbody>
                    </table>
                    {generateResult.details.no_tarif_list?.length > 0 && (
                      <div className="alert alert-warning small">
                        <strong>Rumah tanpa tarif:</strong>
                        <ul className="mb-0 mt-1">
                          {generateResult.details.no_tarif_list.map((r: string, i: number) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p>Pilih bulan untuk membuat tagihan IPL untuk semua rumah.</p>
                    <div className="mb-3">
                      <label className="form-label">Bulan Tagihan *</label>
                      <select
                        className="form-select"
                        value={generateBulan}
                        onChange={(e) => setGenerateBulan(e.target.value)}
                        required
                      >
                        <option value="">-- Pilih Bulan --</option>
                        {getMonthOptions().map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="alert alert-info small">
                      <strong>Info:</strong> Sistem akan membuat tagihan untuk semua rumah berdasarkan tarif yang berlaku. 
                      Rumah yang sudah memiliki tagihan untuk bulan ini akan dilewati.
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowGenerateModal(false)
                    setGenerateResult(null)
                  }}
                >
                  {generateResult ? 'Tutup' : 'Batal'}
                </button>
                {!generateResult && (
                  <button 
                    type="button" 
                    className="btn btn-success"
                    onClick={handleGenerateTagihan}
                    disabled={generating || !generateBulan}
                  >
                    {generating ? (
                      <>
                        <FiLoader className="spin me-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FiPlay className="me-2" />
                        Generate Tagihan
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}