'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { formatRupiah, getRoleLabel } from '@/utils/helpers'
import { KategoriPengeluaran, PengajuanFormInput, PengajuanPembelian } from '@/types'
import { 
  FiSave, 
  FiArrowLeft, 
  FiX, 
  FiAlertTriangle
} from 'react-icons/fi'

export default function EditPengajuanPage() {
  const params = useParams()
  const router = useRouter()
  const { userData, role } = useUser()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [kategoriList, setKategoriList] = useState<KategoriPengeluaran[]>([])
  const [pengajuan, setPengajuan] = useState<PengajuanPembelian | null>(null)
  
  // File uploads
  const [notaInvoice, setNotaInvoice] = useState<File | null>(null)
  const [buktiTransaksi, setBuktiTransaksi] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PengajuanFormInput>()

  // Fetch pengajuan data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch pengajuan
        const { data: pengajuanData, error } = await supabase
          .from('pengajuan_pembelian')
          .select('*')
          .eq('id', params.id)
          .single()

        if (error) throw error
        if (!pengajuanData) {
          router.push('/keuangan/pengajuan')
          return
        }

        // Check if user can edit
        if (pengajuanData.pemohon_id !== userData?.id || !['diajukan', 'direvisi'].includes(pengajuanData.status)) {
          alert('Anda tidak dapat mengedit pengajuan ini')
          router.push('/keuangan/pengajuan')
          return
        }

        setPengajuan(pengajuanData)
        
        // Set form values
        setValue('nama_pemohon', pengajuanData.nama_pemohon)
        setValue('jabatan_pemohon', pengajuanData.jabatan_pemohon)
        setValue('no_wa', pengajuanData.no_wa || '')
        setValue('deskripsi_pembelian', pengajuanData.deskripsi_pembelian)
        setValue('wilayah', pengajuanData.wilayah)
        setValue('tanggal_pengajuan', pengajuanData.tanggal_pengajuan)
        setValue('tanggal_target', pengajuanData.tanggal_target || '')
        setValue('kategori_id', pengajuanData.kategori_id || undefined)
        setValue('nilai_transaksi', pengajuanData.nilai_transaksi)
        setValue('link_referensi', pengajuanData.link_referensi || '')
        setValue('rekening_penerima', pengajuanData.rekening_penerima || '')
        setValue('nama_pemilik_rekening', pengajuanData.nama_pemilik_rekening || '')
        setValue('bank', pengajuanData.bank || '')
        setValue('catatan_tambahan', pengajuanData.catatan_tambahan || '')

        // Fetch kategori
        const { data: kategoriData } = await supabase
          .from('kategori_pengeluaran')
          .select('*')
          .eq('is_active', true)
        
        if (kategoriData) {
          const sorted = kategoriData.sort((a: KategoriPengeluaran, b: KategoriPengeluaran) => parseInt(a.kode) - parseInt(b.kode))
          setKategoriList(sorted)
        }

      } catch (error) {
        console.error('Error fetching data:', error)
        router.push('/keuangan/pengajuan')
      } finally {
        setLoading(false)
      }
    }

    if (userData?.id) {
      fetchData()
    }
  }, [params.id, userData?.id])

  // Compress image
  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        const maxDim = 1200
        let width = img.width
        let height = img.height
        
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = (height / width) * maxDim
            width = maxDim
          } else {
            width = (width / height) * maxDim
            height = maxDim
          }
        }
        
        canvas.width = width
        canvas.height = height
        ctx?.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.7)
      }
      
      img.src = URL.createObjectURL(file)
    })
  }

  // Upload file
  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    try {
      let uploadData: Blob | File = file
      
      if (file.type.startsWith('image/')) {
        uploadData = await compressImage(file)
      }
      
      const fileExt = file.name.split('.').pop()
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      
      const { error } = await supabase.storage
        .from('pengajuan')
        .upload(fileName, uploadData, { cacheControl: '3600', upsert: false })
      
      if (error) {
        console.error('Upload error:', error)
        return null
      }
      
      return fileName
    } catch (error) {
      console.error('Upload error:', error)
      return null
    }
  }

  const onSubmit = async (data: PengajuanFormInput) => {
    if (!pengajuan) return

    try {
      setSubmitting(true)

      let notaInvoiceUrl = pengajuan.nota_invoice_url
      let buktiTransaksiUrl = pengajuan.bukti_transaksi_url

      if (notaInvoice) {
        notaInvoiceUrl = await uploadFile(notaInvoice, 'nota')
      }

      if (buktiTransaksi) {
        buktiTransaksiUrl = await uploadFile(buktiTransaksi, 'transaksi')
      }

      // Update riwayat jika status direvisi -> diajukan
      let newRiwayat = pengajuan.riwayat_status
      let newStatus = pengajuan.status
      
      if (pengajuan.status === 'direvisi') {
        newStatus = 'diajukan'
        newRiwayat = [
          ...pengajuan.riwayat_status,
          {
            status: 'diajukan',
            tanggal: new Date().toISOString(),
            catatan: 'Pengajuan diperbarui setelah revisi',
            oleh: userData?.id || '',
            nama_user: userData?.nama_lengkap || ''
          }
        ]
      }

      const updateData = {
        nama_pemohon: data.nama_pemohon,
        jabatan_pemohon: data.jabatan_pemohon,
        no_wa: data.no_wa || null,
        deskripsi_pembelian: data.deskripsi_pembelian,
        wilayah: data.wilayah,
        tanggal_pengajuan: data.tanggal_pengajuan,
        tanggal_target: data.tanggal_target || null,
        kategori_id: data.kategori_id || null,
        nilai_transaksi: Number(data.nilai_transaksi),
        link_referensi: data.link_referensi || null,
        nota_invoice_url: notaInvoiceUrl,
        bukti_transaksi_url: buktiTransaksiUrl,
        rekening_penerima: data.rekening_penerima || null,
        nama_pemilik_rekening: data.nama_pemilik_rekening || null,
        bank: data.bank || null,
        catatan_tambahan: data.catatan_tambahan || null,
        status: newStatus,
        riwayat_status: newRiwayat,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('pengajuan_pembelian')
        .update(updateData)
        .eq('id', pengajuan.id)

      if (error) throw error

      router.push(`/keuangan/pengajuan/${pengajuan.id}`)
    } catch (error) {
      console.error('Error updating pengajuan:', error)
      alert('Gagal menyimpan pengajuan. Silakan coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-50 p-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (!pengajuan) {
    return null
  }

  return (
    <div className="fade-in p-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title mb-1">Edit Pengajuan</h1>
          <p className="text-muted mb-0">{pengajuan.nomor_pengajuan}</p>
        </div>
        <Link href={`/keuangan/pengajuan/${pengajuan.id}`} className="btn btn-outline-secondary">
          <FiArrowLeft className="me-2" />Kembali
        </Link>
      </div>

      {pengajuan.status === 'direvisi' && (
        <div className="alert alert-warning mb-4">
          <FiAlertTriangle className="me-2" />
          <strong>Pengajuan perlu direvisi.</strong> Silakan perbaiki sesuai catatan dan submit ulang.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="row">
          <div className="col-lg-8">
            {/* Data Pemohon */}
            <div className="card mb-4">
              <div className="card-header bg-primary text-white">
                <h6 className="mb-0 fw-bold">Data Pemohon</h6>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Nama Pemohon <span className="text-danger">*</span></label>
                    <input type="text" className={`form-control ${errors.nama_pemohon ? 'is-invalid' : ''}`} {...register('nama_pemohon', { required: 'Nama wajib diisi' })} />
                    {errors.nama_pemohon && <div className="invalid-feedback">{errors.nama_pemohon.message}</div>}
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Jabatan/Posisi <span className="text-danger">*</span></label>
                    <input type="text" className={`form-control ${errors.jabatan_pemohon ? 'is-invalid' : ''}`} {...register('jabatan_pemohon', { required: 'Jabatan wajib diisi' })} />
                    {errors.jabatan_pemohon && <div className="invalid-feedback">{errors.jabatan_pemohon.message}</div>}
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Nomor WhatsApp</label>
                    <input type="tel" className="form-control" placeholder="08xxxxxxxxxx" {...register('no_wa')} />
                  </div>
                </div>
              </div>
            </div>

            {/* Detail Pengajuan */}
            <div className="card mb-4">
              <div className="card-header bg-primary text-white">
                <h6 className="mb-0 fw-bold">Detail Pengajuan</h6>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-12 mb-3">
                    <label className="form-label">Deskripsi Pembelian <span className="text-danger">*</span></label>
                    <textarea className={`form-control ${errors.deskripsi_pembelian ? 'is-invalid' : ''}`} rows={3} {...register('deskripsi_pembelian', { required: 'Deskripsi wajib diisi' })} />
                    {errors.deskripsi_pembelian && <div className="invalid-feedback">{errors.deskripsi_pembelian.message}</div>}
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Wilayah <span className="text-danger">*</span></label>
                    <select className="form-select" {...register('wilayah', { required: true })}>
                      <option value="Timur">Discovery Timur</option>
                      <option value="Barat">Discovery Barat</option>
                    </select>
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Tanggal Pengajuan</label>
                    <input type="date" className="form-control" {...register('tanggal_pengajuan')} />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Tanggal Target</label>
                    <input type="date" className="form-control" {...register('tanggal_target')} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Kategori Pengeluaran</label>
                    <select className="form-select" {...register('kategori_id', { valueAsNumber: true })}>
                      <option value="">-- Pilih Kategori --</option>
                      {kategoriList.map((k) => (
                        <option key={k.id} value={k.id}>{k.kode}. {k.nama}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Nilai Transaksi <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text">Rp</span>
                      <input type="number" className={`form-control ${errors.nilai_transaksi ? 'is-invalid' : ''}`} {...register('nilai_transaksi', { required: 'Nilai wajib diisi', min: 1 })} />
                    </div>
                    {errors.nilai_transaksi && <div className="text-danger small mt-1">{errors.nilai_transaksi.message}</div>}
                  </div>
                  <div className="col-12 mb-3">
                    <label className="form-label">Link Referensi Harga</label>
                    <input type="url" className="form-control" placeholder="https://..." {...register('link_referensi')} />
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Bukti */}
            <div className="card mb-4">
              <div className="card-header bg-primary text-white">
                <h6 className="mb-0 fw-bold">Upload Bukti</h6>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">Nota/Invoice/Quotation</label>
                  {pengajuan.nota_invoice_url && !notaInvoice && (
                    <p className="small text-success mb-2">✓ File sudah diupload sebelumnya</p>
                  )}
                  <input type="file" className="form-control" accept="image/*,.pdf" onChange={(e) => setNotaInvoice(e.target.files?.[0] || null)} />
                  {notaInvoice && <small className="text-muted">{notaInvoice.name}</small>}
                </div>
                <div className="mb-3">
                  <label className="form-label">Bukti Transaksi Bank</label>
                  {pengajuan.bukti_transaksi_url && !buktiTransaksi && (
                    <p className="small text-success mb-2">✓ File sudah diupload sebelumnya</p>
                  )}
                  <input type="file" className="form-control" accept="image/*,.pdf" onChange={(e) => setBuktiTransaksi(e.target.files?.[0] || null)} />
                  {buktiTransaksi && <small className="text-muted">{buktiTransaksi.name}</small>}
                </div>
              </div>
            </div>

            {/* Reimbursement */}
            <div className="card mb-4">
              <div className="card-header bg-primary text-white">
                <h6 className="mb-0 fw-bold">Data Reimbursement (Jika Ada)</h6>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Nomor Rekening</label>
                    <input type="text" className="form-control" {...register('rekening_penerima')} />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Nama Pemilik Rekening</label>
                    <input type="text" className="form-control" {...register('nama_pemilik_rekening')} />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Bank</label>
                    <select className="form-select" {...register('bank')}>
                      <option value="">-- Pilih Bank --</option>
                      <option value="BCA">BCA</option>
                      <option value="BNI">BNI</option>
                      <option value="BRI">BRI</option>
                      <option value="Mandiri">Mandiri</option>
                      <option value="CIMB Niaga">CIMB Niaga</option>
                      <option value="Permata">Permata</option>
                      <option value="Jago">Jago</option>
                      <option value="Jenius">Jenius</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Catatan */}
            <div className="card mb-4">
              <div className="card-header bg-primary text-white">
                <h6 className="mb-0 fw-bold">Catatan Tambahan</h6>
              </div>
              <div className="card-body">
                <textarea className="form-control" rows={3} {...register('catatan_tambahan')} />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-lg-4">
            <div className="card position-sticky" style={{ top: '1rem' }}>
              <div className="card-body">
                <button type="submit" className="btn btn-primary w-100 mb-3" disabled={submitting}>
                  {submitting ? <><span className="spinner-border spinner-border-sm me-2" />Menyimpan...</> : <><FiSave className="me-2" />Simpan Perubahan</>}
                </button>
                <Link href={`/keuangan/pengajuan/${pengajuan.id}`} className="btn btn-outline-secondary w-100">
                  Batal
                </Link>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}