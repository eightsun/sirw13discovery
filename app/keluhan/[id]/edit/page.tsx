'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { Keluhan, KategoriKeluhan } from '@/types'
import { FiArrowLeft, FiSave, FiLoader, FiLink } from 'react-icons/fi'

const KATEGORI_OPTIONS: { value: KategoriKeluhan; label: string }[] = [
  { value: 'keselamatan', label: 'Keselamatan' },
  { value: 'kebersihan', label: 'Kebersihan' },
  { value: 'keamanan', label: 'Keamanan' },
  { value: 'ketertiban', label: 'Ketertiban' },
  { value: 'kenyamanan', label: 'Kenyamanan' },
  { value: 'infrastruktur', label: 'Infrastruktur' },
  { value: 'fasilitas_umum', label: 'Fasilitas Umum' },
  { value: 'penerangan', label: 'Penerangan' },
  { value: 'saluran_air', label: 'Saluran Air' },
  { value: 'lainnya', label: 'Lainnya' },
]

export default function EditKeluhanPage() {
  const params = useParams()
  const router = useRouter()
  const { user, userData, isRW, loading: userLoading } = useUser()
  const supabase = createClient()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [keluhan, setKeluhan] = useState<Keluhan | null>(null)
  const [pengajuanList, setPengajuanList] = useState<{ id: string; nomor_pengajuan: string; deskripsi_pembelian: string }[]>([])

  const [form, setForm] = useState({
    kategori: '' as KategoriKeluhan | '',
    detail_keluhan: '',
    tanggal_kejadian: '',
    jam_kejadian: '',
    lokasi_keluhan: 'Discovery Timur',
    pengajuan_id: '' as string,
    biaya_penyelesaian: '' as string,
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('keluhan')
          .select('*')
          .eq('id', id)
          .single()
        if (fetchError) throw fetchError
        setKeluhan(data)

        const tgl = new Date(data.tanggal_kejadian)
        setForm({
          kategori: data.kategori,
          detail_keluhan: data.detail_keluhan,
          tanggal_kejadian: tgl.toISOString().slice(0, 10),
          jam_kejadian: tgl.toTimeString().slice(0, 5),
          lokasi_keluhan: data.lokasi_keluhan || 'Discovery Timur',
          pengajuan_id: data.pengajuan_id || '',
          biaya_penyelesaian: data.biaya_penyelesaian ? String(data.biaya_penyelesaian) : '',
        })

        // Fetch pengajuan list for linking (RW only)
        const { data: pList } = await supabase
          .from('pengajuan_pembelian')
          .select('id, nomor_pengajuan, deskripsi_pembelian')
          .order('created_at', { ascending: false })
          .limit(50)
        setPengajuanList(pList || [])
      } catch (err) {
        console.error(err)
        setError('Gagal memuat data')
      } finally {
        setLoading(false)
      }
    }
    if (id) loadData()
  }, [id])

  const handleSubmit = async () => {
    setError('')
    if (!form.kategori) { setError('Pilih kategori'); return }
    if (!form.detail_keluhan.trim()) { setError('Detail keluhan wajib diisi'); return }
    if (!form.tanggal_kejadian) { setError('Tanggal kejadian wajib diisi'); return }

    setSaving(true)
    try {
      const tanggalKejadian = new Date(`${form.tanggal_kejadian}T${form.jam_kejadian || '00:00'}:00`)

      const updateData: Record<string, unknown> = {
        kategori: form.kategori,
        detail_keluhan: form.detail_keluhan.trim(),
        tanggal_kejadian: tanggalKejadian.toISOString(),
        lokasi_keluhan: form.lokasi_keluhan,
        updated_at: new Date().toISOString(),
      }

      // RW bisa set pengajuan dan biaya
      if (isRW) {
        updateData.pengajuan_id = form.pengajuan_id || null
        updateData.biaya_penyelesaian = form.biaya_penyelesaian ? Number(form.biaya_penyelesaian) : 0
      }

      const { error: updateError } = await supabase
        .from('keluhan')
        .update(updateData)
        .eq('id', id)

      if (updateError) throw updateError
      router.push(`/keluhan/${id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  if (loading || userLoading) return <div className="text-center py-5"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div></div>
  if (!keluhan) return <div className="text-center py-5"><p className="text-muted">Laporan tidak ditemukan</p><Link href="/keluhan" className="btn btn-primary">Kembali</Link></div>

  const isCreator = keluhan.pelapor_id === user?.id
  if (!isCreator && !isRW) return <div className="text-center py-5"><p className="text-muted">Anda tidak memiliki akses untuk mengedit laporan ini</p><Link href={`/keluhan/${id}`} className="btn btn-primary">Kembali</Link></div>

  return (
    <div className="fade-in">
      <div className="d-flex align-items-center mb-4">
        <Link href={`/keluhan/${id}`} className="btn btn-outline-secondary me-3"><FiArrowLeft /></Link>
        <div>
          <h1 className="page-title mb-0">Edit Laporan {keluhan.nomor_laporan}</h1>
          <small className="text-muted">Koreksi informasi laporan keluhan</small>
        </div>
      </div>

      {error && <div className="alert alert-danger alert-dismissible">{error}<button type="button" className="btn-close" onClick={() => setError('')} /></div>}

      <div className="row">
        <div className="col-lg-8">
          <div className="card mb-4">
            <div className="card-header bg-danger text-white"><h6 className="mb-0 fw-bold">Detail Keluhan</h6></div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Lokasi Keluhan</label>
                <select className="form-select" value={form.lokasi_keluhan} onChange={(e) => setForm(f => ({ ...f, lokasi_keluhan: e.target.value }))}>
                  <option value="Discovery Timur">Discovery Timur</option>
                  <option value="Discovery Barat">Discovery Barat</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Kategori Keluhan <span className="text-danger">*</span></label>
                <select className="form-select" value={form.kategori} onChange={(e) => setForm(f => ({ ...f, kategori: e.target.value as KategoriKeluhan }))}>
                  <option value="">-- Pilih --</option>
                  {KATEGORI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">Tanggal Kejadian <span className="text-danger">*</span></label>
                  <input type="date" className="form-control" value={form.tanggal_kejadian} onChange={(e) => setForm(f => ({ ...f, tanggal_kejadian: e.target.value }))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Jam Kejadian</label>
                  <input type="time" className="form-control" value={form.jam_kejadian} onChange={(e) => setForm(f => ({ ...f, jam_kejadian: e.target.value }))} />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Detail Keluhan <span className="text-danger">*</span></label>
                <textarea className="form-control" rows={8} style={{ resize: 'vertical' }} value={form.detail_keluhan} onChange={(e) => setForm(f => ({ ...f, detail_keluhan: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Pengajuan & Biaya - RW Only */}
          {isRW && (
            <div className="card mb-4">
              <div className="card-header bg-warning bg-opacity-25"><h6 className="mb-0 fw-bold"><FiLink className="me-2" />Hubungkan Pengajuan & Biaya</h6></div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">Nomor Pengajuan Terkait</label>
                  <select className="form-select" value={form.pengajuan_id} onChange={(e) => setForm(f => ({ ...f, pengajuan_id: e.target.value }))}>
                    <option value="">-- Tidak ada pengajuan terkait --</option>
                    {pengajuanList.map((p: { id: string; nomor_pengajuan: string; deskripsi_pembelian: string }) => (
                      <option key={p.id} value={p.id}>{p.nomor_pengajuan} - {p.deskripsi_pembelian.slice(0, 50)}</option>
                    ))}
                  </select>
                  <small className="text-muted">Hubungkan dengan pengajuan pembelian jika penyelesaian butuh material/alat</small>
                </div>

                <div className="mb-3">
                  <label className="form-label">Biaya Penyelesaian</label>
                  <div className="input-group">
                    <span className="input-group-text">Rp</span>
                    <input type="number" className="form-control" placeholder="0" value={form.biaya_penyelesaian} onChange={(e) => setForm(f => ({ ...f, biaya_penyelesaian: e.target.value }))} min="0" />
                  </div>
                  <small className="text-muted">Total biaya yang dikeluarkan untuk menyelesaikan keluhan</small>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="col-lg-4">
          <div className="card" style={{ position: 'sticky', top: '1rem' }}>
            <div className="card-body">
              <div className="mb-3 p-2 bg-light rounded small">
                <div className="text-muted mb-1">Nomor Laporan</div>
                <div className="fw-bold">{keluhan.nomor_laporan}</div>
                <div className="text-muted mt-2 mb-1">Pelapor</div>
                <div className="fw-bold">{keluhan.nama_pelapor}</div>
                <div className="text-muted mt-2 mb-1">Status</div>
                <div className="fw-bold">{keluhan.status}</div>
              </div>
              <button className="btn btn-primary w-100 mb-2" onClick={handleSubmit} disabled={saving}>
                {saving ? <><FiLoader className="spin me-2" />Menyimpan...</> : <><FiSave className="me-2" />Simpan Perubahan</>}
              </button>
              <Link href={`/keluhan/${id}`} className="btn btn-outline-secondary w-100">Batal</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}