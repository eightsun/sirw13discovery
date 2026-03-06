'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { KategoriKeluhan } from '@/types'
import { FiArrowLeft, FiSave, FiCamera, FiX, FiLoader, FiAlertTriangle } from 'react-icons/fi'

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

export default function BuatKeluhanPage() {
  const router = useRouter()
  const { user, userData, loading: userLoading } = useUser()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [pelapor, setPelapor] = useState({ nama: '', blok: '', nomor_rumah: '', rt_id: '' })
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([])

  const [form, setForm] = useState({
    kategori: '' as KategoriKeluhan | '',
    detail_keluhan: '',
    tanggal_kejadian: '',
    jam_kejadian: '',
    lokasi_keluhan: 'Discovery Timur' as string,
  })

  // Auto-fill pelapor data
  useEffect(() => {
    const loadPelapor = async () => {
      if (!userData?.warga_id) return
      const { data: w } = await supabase
        .from('warga')
        .select('nama_lengkap, nomor_rumah, rt_id, jalan:jalan_id(nama_jalan), perumahan')
        .eq('id', userData.warga_id)
        .single()
      if (w) {
        const jalan = w.jalan as { nama_jalan: string } | null
        const blok = jalan?.nama_jalan ? `${jalan.nama_jalan}` : (w.perumahan || '')
        setPelapor({ nama: w.nama_lengkap, blok, nomor_rumah: w.nomor_rumah || '', rt_id: w.rt_id || '' })
      }
    }
    loadPelapor()
  }, [userData])

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (photos.length + files.length > 5) { setError('Maksimal 5 foto'); return }
    const newPhotos = files.filter(f => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) return false
      if (f.size > 10 * 1024 * 1024) return false
      return true
    }).map(f => ({ file: f, preview: URL.createObjectURL(f) }))
    setPhotos(prev => [...prev, ...newPhotos])
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removePhoto = (idx: number) => {
    URL.revokeObjectURL(photos[idx].preview)
    setPhotos(prev => prev.filter((_, i) => i !== idx))
  }

  const uploadPhotos = async (): Promise<string[]> => {
    const urls: string[] = []
    for (const p of photos) {
      const fd = new FormData()
      fd.append('file', p.file)
      fd.append('type', 'bukti')
      const res = await fetch('/api/upload-keluhan', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      urls.push(data.fileUrl)
    }
    return urls
  }

  const handleSubmit = async () => {
    setError('')
    if (!form.kategori) { setError('Pilih kategori keluhan'); return }
    if (!form.detail_keluhan.trim()) { setError('Detail keluhan wajib diisi'); return }
    if (!form.tanggal_kejadian) { setError('Tanggal kejadian wajib diisi'); return }
    if (!user) return

    setSaving(true)
    try {
      let fotoUrls: string[] = []
      if (photos.length > 0) {
        setUploading(true)
        fotoUrls = await uploadPhotos()
        setUploading(false)
      }

      const tanggalKejadian = new Date(`${form.tanggal_kejadian}T${form.jam_kejadian || '00:00'}:00`)

      const insertData = {
        nomor_laporan: '', // trigger will generate
        pelapor_id: user.id,
        nama_pelapor: pelapor.nama,
        blok_rumah: pelapor.blok,
        nomor_rumah: pelapor.nomor_rumah,
        rt_id: pelapor.rt_id || null,
        lokasi_keluhan: form.lokasi_keluhan,
        kategori: form.kategori,
        detail_keluhan: form.detail_keluhan.trim(),
        tanggal_kejadian: tanggalKejadian.toISOString(),
        foto_urls: fotoUrls,
        status: 'dikirim',
      }

      const { data, error: insertError } = await supabase
        .from('keluhan')
        .insert(insertData)
        .select('id')
        .single()
      if (insertError) throw insertError

      // Add timeline entry
      await supabase.from('keluhan_timeline').insert({
        keluhan_id: data.id,
        status: 'dikirim',
        catatan: 'Laporan dikirim oleh pelapor',
        user_id: user.id,
        nama_user: pelapor.nama,
      })

      router.push(`/keluhan/${data.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim laporan')
    } finally {
      setSaving(false)
      setUploading(false)
    }
  }

  if (userLoading) return <div className="text-center py-5"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div></div>

  return (
    <div className="fade-in">
      <div className="d-flex align-items-center mb-4">
        <Link href="/keluhan" className="btn btn-outline-secondary me-3"><FiArrowLeft /></Link>
        <div>
          <h1 className="page-title mb-0">Buat Laporan Keluhan</h1>
          <small className="text-muted">Laporkan masalah di lingkungan Anda</small>
        </div>
      </div>

      {error && <div className="alert alert-danger alert-dismissible">{error}<button type="button" className="btn-close" onClick={() => setError('')} /></div>}

      <div className="row">
        <div className="col-lg-8">
          {/* Data Pelapor */}
          <div className="card mb-4">
            <div className="card-header bg-secondary text-white"><h6 className="mb-0 fw-bold">Data Pelapor (Otomatis)</h6></div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-4"><label className="form-label small text-muted">Nama Lengkap</label><input className="form-control form-control-sm" value={pelapor.nama} disabled /></div>
                <div className="col-md-4"><label className="form-label small text-muted">Blok Rumah</label><input className="form-control form-control-sm" value={pelapor.blok} disabled /></div>
                <div className="col-md-4"><label className="form-label small text-muted">Nomor Rumah</label><input className="form-control form-control-sm" value={pelapor.nomor_rumah} disabled /></div>
              </div>
            </div>
          </div>

          {/* Detail Keluhan */}
          <div className="card mb-4">
            <div className="card-header bg-danger text-white"><h6 className="mb-0 fw-bold"><FiAlertTriangle className="me-2" />Detail Keluhan</h6></div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Lokasi Keluhan <span className="text-danger">*</span></label>
                <select className="form-select" value={form.lokasi_keluhan} onChange={(e) => setForm(f => ({ ...f, lokasi_keluhan: e.target.value }))}>
                  <option value="Discovery Timur">Discovery Timur</option>
                  <option value="Discovery Barat">Discovery Barat</option>
                  <option value="Lainnya">Lainnya (di luar perumahan)</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Kategori Keluhan <span className="text-danger">*</span></label>
                <select className="form-select" value={form.kategori} onChange={(e) => setForm(f => ({ ...f, kategori: e.target.value as KategoriKeluhan }))}>
                  <option value="">-- Pilih Kategori --</option>
                  {KATEGORI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">Tanggal Kejadian <span className="text-danger">*</span></label>
                  <input type="date" className="form-control" value={form.tanggal_kejadian} onChange={(e) => setForm(f => ({ ...f, tanggal_kejadian: e.target.value }))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Jam Kejadian/Ditemukan</label>
                  <input type="time" className="form-control" value={form.jam_kejadian} onChange={(e) => setForm(f => ({ ...f, jam_kejadian: e.target.value }))} />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Detail Keluhan <span className="text-danger">*</span></label>
                <textarea className="form-control" rows={6} style={{ resize: 'vertical' }} placeholder="Jelaskan detail keluhan, lokasi spesifik, dan kondisi yang ditemukan..." value={form.detail_keluhan} onChange={(e) => setForm(f => ({ ...f, detail_keluhan: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Foto */}
          <div className="card mb-4">
            <div className="card-header"><h6 className="mb-0 fw-bold"><FiCamera className="me-2" />Foto Bukti <span className="text-muted fw-normal">(Opsional)</span></h6></div>
            <div className="card-body">
              <div className="row g-2 mb-3">
                {photos.map((p, i) => (
                  <div key={i} className="col-4 col-md-3 position-relative">
                    <img src={p.preview} alt="" className="rounded" style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                    <button className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1 rounded-circle" style={{ width: 24, height: 24, padding: 0 }} onClick={() => removePhoto(i)}><FiX size={12} /></button>
                  </div>
                ))}
                {photos.length < 5 && (
                  <div className="col-4 col-md-3">
                    <div className="border rounded d-flex align-items-center justify-content-center text-muted" style={{ height: '100px', cursor: 'pointer', borderStyle: 'dashed' }} onClick={() => fileInputRef.current?.click()}>
                      <div className="text-center"><FiCamera size={20} /><div style={{ fontSize: '0.7rem' }}>Tambah</div></div>
                    </div>
                  </div>
                )}
              </div>
              <small className="text-muted">Maks. 5 foto (JPG, PNG, WEBP). Maks. 10MB per file.</small>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="d-none" multiple onChange={handlePhotoSelect} />
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card" style={{ position: 'sticky', top: '1rem' }}>
            <div className="card-body">
              <button className="btn btn-danger w-100 mb-2" onClick={handleSubmit} disabled={saving || uploading}>
                {saving || uploading ? <><FiLoader className="spin me-2" />{uploading ? 'Mengupload foto...' : 'Mengirim...'}</> : <><FiSave className="me-2" />Kirim Laporan</>}
              </button>
              <Link href="/keluhan" className="btn btn-outline-secondary w-100">Batal</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}