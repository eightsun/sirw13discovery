'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { formatRupiah, getRoleLabel } from '@/utils/helpers'
import { KategoriPengeluaran, PengajuanFormInput, BudgetSummary } from '@/types'
import { 
  FiSave, 
  FiArrowLeft, 
  FiUpload, 
  FiX, 
  FiAlertTriangle,
  FiInfo
} from 'react-icons/fi'

export default function TambahPengajuanPage() {
  const router = useRouter()
  const { userData, role } = useUser()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [kategoriList, setKategoriList] = useState<KategoriPengeluaran[]>([])
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null)
  const [budgetWarning, setBudgetWarning] = useState<string | null>(null)
  
  // File uploads - Hapus buktiPersetujuan karena approval via aplikasi
  const [notaInvoice, setNotaInvoice] = useState<File | null>(null)
  const [buktiTransaksi, setBuktiTransaksi] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PengajuanFormInput>({
    defaultValues: {
      nama_pemohon: userData?.nama_lengkap || '',
      tanggal_pengajuan: new Date().toISOString().split('T')[0],
      wilayah: 'Timur',
    }
  })

  const watchedKategori = watch('kategori_id')
  const watchedWilayah = watch('wilayah')
  const watchedNilai = watch('nilai_transaksi')

  // Set nama pemohon, jabatan, dan WhatsApp dari userData saat tersedia
  useEffect(() => {
    const fetchUserData = async () => {
      if (userData?.nama_lengkap) {
        setValue('nama_pemohon', userData.nama_lengkap)
      }
      if (role) {
        setValue('jabatan_pemohon', getRoleLabel(role))
      }
      
      // Fetch nomor WhatsApp dari data warga
      if (userData?.id) {
        const { data: wargaData } = await supabase
          .from('warga')
          .select('no_hp')
          .eq('user_id', userData.id)
          .single()
        
        if (wargaData?.no_hp) {
          setValue('no_wa', wargaData.no_hp)
        }
      }
    }
    
    fetchUserData()
  }, [userData, role, setValue])

  // Fetch kategori dengan sorting numerik
  useEffect(() => {
    const fetchKategori = async () => {
      const { data } = await supabase
        .from('kategori_pengeluaran')
        .select('*')
        .eq('is_active', true)
      
      if (data) {
        // Sort berdasarkan kode secara numerik
        const sorted = data.sort((a: KategoriPengeluaran, b: KategoriPengeluaran) => parseInt(a.kode) - parseInt(b.kode))
        setKategoriList(sorted)
      }
    }
    fetchKategori()
  }, [])

  // Check budget saat kategori atau wilayah berubah
  useEffect(() => {
    const checkBudget = async () => {
      if (!watchedKategori || !watchedWilayah) {
        setBudgetSummary(null)
        setBudgetWarning(null)
        return
      }

      const tahun = new Date().getFullYear()
      
      // Get budget
      const { data: budgetData } = await supabase
        .from('budget_tahunan')
        .select('jumlah_budget')
        .eq('tahun', tahun)
        .eq('wilayah', watchedWilayah)
        .eq('kategori_id', watchedKategori)
        .single()

      // Get total pengeluaran kategori ini
      const { data: transaksiData } = await supabase
        .from('kas_transaksi')
        .select('jumlah')
        .eq('wilayah', watchedWilayah)
        .eq('kategori_id', watchedKategori)
        .eq('tipe', 'pengeluaran')
        .gte('tanggal', `${tahun}-01-01`)

      const budget = budgetData?.jumlah_budget || 0
      const terpakai = transaksiData?.reduce((sum: number, t: { jumlah: number }) => sum + t.jumlah, 0) || 0
      const sisa = budget - terpakai
      const persentase = budget > 0 ? (terpakai / budget) * 100 : 0

      const kategori = kategoriList.find(k => k.id === Number(watchedKategori))

      setBudgetSummary({
        kategori_id: Number(watchedKategori),
        kategori_nama: kategori?.nama || '',
        budget,
        terpakai,
        sisa,
        persentase
      })

      // Check warning
      if (watchedNilai && sisa < watchedNilai) {
        setBudgetWarning(`Nilai pengajuan (${formatRupiah(watchedNilai)}) melebihi sisa budget (${formatRupiah(sisa)})`)
      } else {
        setBudgetWarning(null)
      }
    }

    checkBudget()
  }, [watchedKategori, watchedWilayah, watchedNilai, kategoriList])

  // Compress image before upload
  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        // Max dimension
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
        
        canvas.toBlob(
          (blob) => resolve(blob!),
          'image/jpeg',
          0.7 // Quality
        )
      }
      
      img.src = URL.createObjectURL(file)
    })
  }

  // Upload file to Supabase Storage (Private Bucket)
  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    try {
      let uploadData: Blob | File = file
      
      // Compress if image
      if (file.type.startsWith('image/')) {
        uploadData = await compressImage(file)
      }
      
      const fileExt = file.name.split('.').pop()
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('pengajuan')
        .upload(fileName, uploadData, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) {
        console.error('Upload error:', error)
        return null
      }
      
      // Return path only (not public URL)
      // URL will be generated when viewing using createSignedUrl
      return fileName
    } catch (error) {
      console.error('Upload error:', error)
      return null
    }
  }

  const onSubmit = async (data: PengajuanFormInput) => {
    try {
      setSubmitting(true)

      // Generate nomor pengajuan yang unik
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const prefix = `PB/${year}/${month}/`

      // Cari nomor terakhir untuk bulan ini
      const { data: existingData } = await supabase
        .from('pengajuan_pembelian')
        .select('nomor_pengajuan')
        .like('nomor_pengajuan', `${prefix}%`)
        .order('nomor_pengajuan', { ascending: false })
        .limit(1)

      let nextNumber = 1
      if (existingData && existingData.length > 0) {
        const lastNomor = existingData[0].nomor_pengajuan
        const lastNumber = parseInt(lastNomor.split('/').pop() || '0')
        nextNumber = lastNumber + 1
      }

      const nomor_pengajuan = `${prefix}${String(nextNumber).padStart(4, '0')}`

      // Upload files (tanpa bukti persetujuan - approval via aplikasi)
      let notaInvoiceUrl: string | null = null
      let buktiTransaksiUrl: string | null = null

      if (notaInvoice) {
        setUploadProgress(prev => ({ ...prev, nota: 0 }))
        notaInvoiceUrl = await uploadFile(notaInvoice, 'nota')
        setUploadProgress(prev => ({ ...prev, nota: 100 }))
      }

      if (buktiTransaksi) {
        setUploadProgress(prev => ({ ...prev, transaksi: 0 }))
        buktiTransaksiUrl = await uploadFile(buktiTransaksi, 'transaksi')
        setUploadProgress(prev => ({ ...prev, transaksi: 100 }))
      }

      // Prepare data
      const pengajuanData = {
        nomor_pengajuan,
        pemohon_id: userData?.id,
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
        bukti_persetujuan_url: null, // Approval via aplikasi
        nota_invoice_url: notaInvoiceUrl,
        bukti_transaksi_url: buktiTransaksiUrl,
        rekening_penerima: data.rekening_penerima || null,
        nama_pemilik_rekening: data.nama_pemilik_rekening || null,
        bank: data.bank || null,
        catatan_tambahan: data.catatan_tambahan || null,
        status: 'diajukan',
        riwayat_status: [{
          status: 'diajukan',
          tanggal: new Date().toISOString(),
          catatan: 'Pengajuan dibuat',
          oleh: userData?.id || '',
          nama_user: userData?.nama_lengkap || ''
        }]
      }

      const { error } = await supabase
        .from('pengajuan_pembelian')
        .insert(pengajuanData)

      if (error) throw error

      router.push('/keuangan/pengajuan')
    } catch (error) {
      console.error('Error creating pengajuan:', error)
      alert('Gagal menyimpan pengajuan. Silakan coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  const FileUploadField = ({
    label,
    file,
    setFile,
    accept = 'image/*,.pdf',
    progress
  }: {
    label: string
    file: File | null
    setFile: (f: File | null) => void
    accept?: string
    progress?: number
  }) => (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      <div className="input-group">
        <input
          type="file"
          className="form-control"
          accept={accept}
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        {file && (
          <button
            type="button"
            className="btn btn-outline-danger"
            onClick={() => setFile(null)}
          >
            <FiX />
          </button>
        )}
      </div>
      {file && (
        <small className="text-muted">
          {file.name} ({(file.size / 1024).toFixed(1)} KB)
        </small>
      )}
      {progress !== undefined && progress > 0 && progress < 100 && (
        <div className="progress mt-1" style={{ height: '5px' }}>
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  )

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title mb-1">Buat Pengajuan Pembelian</h1>
          <p className="text-muted mb-0">
            Isi formulir pengajuan pembelian atau pengeluaran
          </p>
        </div>
        <Link href="/keuangan/pengajuan" className="btn btn-outline-secondary">
          <FiArrowLeft className="me-2" />
          Kembali
        </Link>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="row">
          {/* Main Form */}
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
                    <input
                      type="text"
                      className={`form-control ${errors.nama_pemohon ? 'is-invalid' : ''}`}
                      {...register('nama_pemohon', { required: 'Nama pemohon wajib diisi' })}
                    />
                    {errors.nama_pemohon && (
                      <div className="invalid-feedback">{errors.nama_pemohon.message}</div>
                    )}
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Jabatan/Posisi <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className={`form-control ${errors.jabatan_pemohon ? 'is-invalid' : ''}`}
                      placeholder="Contoh: Koordinator Keamanan"
                      {...register('jabatan_pemohon', { required: 'Jabatan wajib diisi' })}
                    />
                    {errors.jabatan_pemohon && (
                      <div className="invalid-feedback">{errors.jabatan_pemohon.message}</div>
                    )}
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Nomor WhatsApp</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="08xxxxxxxxxx"
                      {...register('no_wa')}
                    />
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
                    <textarea
                      className={`form-control ${errors.deskripsi_pembelian ? 'is-invalid' : ''}`}
                      rows={3}
                      placeholder="Jelaskan detail barang/jasa yang akan dibeli..."
                      {...register('deskripsi_pembelian', { required: 'Deskripsi wajib diisi' })}
                    />
                    {errors.deskripsi_pembelian && (
                      <div className="invalid-feedback">{errors.deskripsi_pembelian.message}</div>
                    )}
                  </div>

                  <div className="col-md-4 mb-3">
                    <label className="form-label">Wilayah <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      {...register('wilayah', { required: true })}
                    >
                      <option value="Timur">Discovery Timur</option>
                      <option value="Barat">Discovery Barat</option>
                    </select>
                  </div>

                  <div className="col-md-4 mb-3">
                    <label className="form-label">Tanggal Pengajuan <span className="text-danger">*</span></label>
                    <input
                      type="date"
                      className="form-control"
                      {...register('tanggal_pengajuan', { required: true })}
                    />
                  </div>

                  <div className="col-md-4 mb-3">
                    <label className="form-label">Tanggal Target</label>
                    <input
                      type="date"
                      className="form-control"
                      {...register('tanggal_target')}
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Kategori Pengeluaran</label>
                    <select
                      className="form-select"
                      {...register('kategori_id', { valueAsNumber: true })}
                    >
                      <option value="">-- Pilih Kategori --</option>
                      {kategoriList.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.kode}. {k.nama}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Nilai Transaksi <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text">Rp</span>
                      <input
                        type="number"
                        className={`form-control ${errors.nilai_transaksi ? 'is-invalid' : ''}`}
                        placeholder="0"
                        {...register('nilai_transaksi', { 
                          required: 'Nilai wajib diisi',
                          min: { value: 1, message: 'Nilai harus lebih dari 0' }
                        })}
                      />
                    </div>
                    {errors.nilai_transaksi && (
                      <div className="text-danger small mt-1">{errors.nilai_transaksi.message}</div>
                    )}
                  </div>

                  <div className="col-12 mb-3">
                    <label className="form-label">Link Referensi Harga</label>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="https://..."
                      {...register('link_referensi')}
                    />
                    <small className="text-muted">Link ke toko online atau quotation</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Bukti */}
            <div className="card mb-4">
              <div className="card-header bg-primary text-white">
                <h6 className="mb-0 fw-bold">Upload Bukti (Opsional)</h6>
              </div>
              <div className="card-body">
                <FileUploadField
                  label="Nota/Invoice/Quotation"
                  file={notaInvoice}
                  setFile={setNotaInvoice}
                  progress={uploadProgress.nota}
                />
                <FileUploadField
                  label="Bukti Transaksi Bank (untuk Reimbursement)"
                  file={buktiTransaksi}
                  setFile={setBuktiTransaksi}
                  progress={uploadProgress.transaksi}
                />
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
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nomor rekening penerima"
                      {...register('rekening_penerima')}
                    />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Nama Pemilik Rekening</label>
                    <input
                      type="text"
                      className="form-control"
                      {...register('nama_pemilik_rekening')}
                    />
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
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Catatan tambahan jika ada..."
                  {...register('catatan_tambahan')}
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-lg-4">
            {/* Budget Info */}
            {budgetSummary && budgetSummary.budget > 0 && (
              <div className="card mb-4">
                <div className="card-header bg-info text-white">
                  <h6 className="mb-0 fw-bold">
                    <FiInfo className="me-2" />
                    Info Budget
                  </h6>
                </div>
                <div className="card-body">
                  <p className="mb-2"><strong>{budgetSummary.kategori_nama}</strong></p>
                  <div className="mb-2">
                    <small className="text-muted">Budget Tahun Ini</small>
                    <div className="fw-bold">{formatRupiah(budgetSummary.budget)}</div>
                  </div>
                  <div className="mb-2">
                    <small className="text-muted">Sudah Terpakai</small>
                    <div className="fw-bold text-danger">{formatRupiah(budgetSummary.terpakai)}</div>
                  </div>
                  <div className="mb-3">
                    <small className="text-muted">Sisa Budget</small>
                    <div className="fw-bold text-success">{formatRupiah(budgetSummary.sisa)}</div>
                  </div>
                  <div className="progress" style={{ height: '10px' }}>
                    <div 
                      className={`progress-bar ${budgetSummary.persentase > 80 ? 'bg-danger' : 'bg-success'}`}
                      style={{ width: `${Math.min(budgetSummary.persentase, 100)}%` }}
                    />
                  </div>
                  <small className="text-muted">{budgetSummary.persentase.toFixed(1)}% terpakai</small>
                </div>
              </div>
            )}

            {/* Budget Warning */}
            {budgetWarning && (
              <div className="alert alert-warning">
                <FiAlertTriangle className="me-2" />
                {budgetWarning}
              </div>
            )}

            {/* Submit Button */}
            <div className="card">
              <div className="card-body">
                <button
                  type="submit"
                  className="btn btn-primary w-100 mb-3"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <FiSave className="me-2" />
                      Simpan Pengajuan
                    </>
                  )}
                </button>
                <Link href="/keuangan/pengajuan" className="btn btn-outline-secondary w-100">
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