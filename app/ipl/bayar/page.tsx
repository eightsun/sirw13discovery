'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { TagihanIPL, Rumah } from '@/types'
import { FiArrowLeft, FiUpload, FiCheck, FiX, FiLoader, FiImage } from 'react-icons/fi'
import imageCompression from 'browser-image-compression'

interface TagihanOption extends TagihanIPL {
  selected: boolean
}

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function BayarIPLPage() {
  const router = useRouter()
  const { userData, loading: userLoading } = useUser()
  const supabase = createClient()
  
  const [myRumah, setMyRumah] = useState<Rumah | null>(null)
  const [tagihanList, setTagihanList] = useState<TagihanOption[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Form state
  const [tanggalBayar, setTanggalBayar] = useState(new Date().toISOString().split('T')[0])
  const [metode, setMetode] = useState<'transfer' | 'tunai' | 'lainnya'>('transfer')
  const [buktiFile, setBuktiFile] = useState<File | null>(null)
  const [buktiUrl, setBuktiUrl] = useState<string>('')
  const [buktiFileId, setBuktiFileId] = useState<string>('')
  const [catatan, setCatatan] = useState('')
  
  // Compression info
  const [originalSize, setOriginalSize] = useState<number>(0)
  const [compressedSize, setCompressedSize] = useState<number>(0)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        if (!userData?.warga_id) {
          setError('Anda belum terdaftar sebagai warga')
          return
        }

        // Get user's rumah
        const { data: wargaData } = await supabase
          .from('warga')
          .select('rumah_id')
          .eq('id', userData.warga_id)
          .single()
        
        if (!wargaData?.rumah_id) {
          setError('Data rumah Anda tidak ditemukan')
          return
        }

        // Get rumah details
        const { data: rumahData } = await supabase
          .from('rumah')
          .select(`
            *,
            jalan:jalan_id (nama_jalan),
            rt:rt_id (nomor_rt),
            kepala_keluarga:kepala_keluarga_id (nama_lengkap)
          `)
          .eq('id', wargaData.rumah_id)
          .single()
        
        setMyRumah(rumahData)

        // Get unpaid tagihan for this rumah
        const { data: tagihanData, error: tagihanError } = await supabase
          .from('tagihan_ipl')
          .select('*')
          .eq('rumah_id', wargaData.rumah_id)
          .in('status', ['belum_lunas', 'sebagian'])
          .order('bulan', { ascending: true })

        if (tagihanError) throw tagihanError

        setTagihanList((tagihanData || []).map((t: TagihanIPL) => ({ ...t, selected: false })))

      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Gagal memuat data')
      } finally {
        setLoading(false)
      }
    }

    if (!userLoading && userData) {
      fetchData()
    }
  }, [userLoading, userData])

  // Calculate total selected
  const totalSelected = useMemo(() => {
    return tagihanList
      .filter(t => t.selected)
      .reduce((sum, t) => sum + (t.jumlah_tagihan - t.jumlah_terbayar), 0)
  }, [tagihanList])

  const selectedCount = useMemo(() => {
    return tagihanList.filter(t => t.selected).length
  }, [tagihanList])

  const toggleTagihan = (id: string) => {
    setTagihanList(prev => prev.map(t => 
      t.id === id ? { ...t, selected: !t.selected } : t
    ))
  }

  const selectAll = () => {
    setTagihanList(prev => prev.map(t => ({ ...t, selected: true })))
  }

  const deselectAll = () => {
    setTagihanList(prev => prev.map(t => ({ ...t, selected: false })))
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      setError('File harus berupa gambar (JPG, PNG, GIF, WEBP) atau PDF')
      return
    }

    // Validate file size (max 10MB for original)
    if (file.size > 10 * 1024 * 1024) {
      setError('Ukuran file maksimal 10MB')
      return
    }

    setOriginalSize(file.size)
    setError(null)
    
    // Check if it's an image that can be compressed
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    
    if (imageTypes.includes(file.type)) {
      // Compress image
      try {
        setCompressing(true)
        
        const options = {
          maxSizeMB: 0.3, // Kompres ke maksimal 300KB
          maxWidthOrHeight: 1920, // Max dimension
          useWebWorker: true,
          fileType: 'image/jpeg' as const, // Convert to JPEG for smaller size
        }
        
        const compressedFile = await imageCompression(file, options)
        setCompressedSize(compressedFile.size)
        
        // Create new file with original name but compressed content
        const finalFile = new File(
          [compressedFile], 
          file.name.replace(/\.[^/.]+$/, '.jpg'), // Change extension to .jpg
          { type: 'image/jpeg' }
        )
        
        setBuktiFile(finalFile)
        setCompressing(false)
        
        // TIDAK langsung upload - tunggu submit
        
      } catch (compressError) {
        console.error('Compression error:', compressError)
        // If compression fails, use original
        setBuktiFile(file)
        setCompressedSize(file.size)
        setCompressing(false)
      }
    } else {
      // PDF - simpan tanpa kompresi
      setBuktiFile(file)
      setCompressedSize(file.size)
    }
  }

  const uploadFile = async (file: File): Promise<{fileUrl: string, fileId: string} | null> => {
    try {
      setUploading(true)
      setError(null)

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload-drive', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload gagal')
      }

      return {
        fileUrl: result.fileUrl,
        fileId: result.fileId
      }
      
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Gagal mengupload file')
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validations
    const selectedTagihan = tagihanList.filter(t => t.selected)
    
    if (selectedTagihan.length === 0) {
      setError('Pilih minimal satu bulan tagihan')
      return
    }

    if (metode === 'transfer' && !buktiFile) {
      setError('Upload bukti transfer terlebih dahulu')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      // Upload file terlebih dahulu jika ada
      let uploadedUrl = buktiUrl
      let uploadedFileId = buktiFileId
      
      if (buktiFile && !buktiUrl) {
        const uploadResult = await uploadFile(buktiFile)
        if (!uploadResult) {
          setSubmitting(false)
          return // Error sudah di-set di uploadFile
        }
        uploadedUrl = uploadResult.fileUrl
        uploadedFileId = uploadResult.fileId
        
        // Update state untuk tampilan
        setBuktiUrl(uploadedUrl)
        setBuktiFileId(uploadedFileId)
      }

      // Prepare data
      const bulanDibayar = selectedTagihan.map(t => t.bulan)
      
      const pembayaranData = {
        rumah_id: myRumah?.id,
        jumlah_dibayar: totalSelected,
        tanggal_bayar: tanggalBayar,
        metode,
        bukti_url: uploadedUrl || null,
        bukti_file_id: uploadedFileId || null,
        dibayar_oleh: userData?.id,
        bulan_dibayar: bulanDibayar,
        status: 'pending',
        catatan: catatan || null,
      }

      const { error: insertError } = await supabase
        .from('pembayaran_ipl')
        .insert(pembayaranData)

      if (insertError) throw insertError

      setSuccess(true)
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/ipl')
      }, 2000)

    } catch (err: any) {
      console.error('Submit error:', err)
      setError(err.message || 'Gagal menyimpan pembayaran')
    } finally {
      setSubmitting(false)
    }
  }

  const formatBulan = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
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

  if (success) {
    return (
      <div className="text-center py-5">
        <div className="mb-4">
          <FiCheck size={64} className="text-success" />
        </div>
        <h3>Pembayaran Berhasil Dikirim!</h3>
        <p className="text-muted">
          Pembayaran Anda sedang menunggu verifikasi dari pengurus.
          <br />
          Anda akan diarahkan ke halaman tagihan...
        </p>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="d-flex align-items-center mb-4">
        <Link href="/ipl" className="btn btn-outline-secondary me-3">
          <FiArrowLeft />
        </Link>
        <div>
          <h1 className="page-title mb-0">Bayar IPL</h1>
          <p className="text-muted mb-0">Form Pembayaran Iuran Pengelolaan Lingkungan</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)} />
        </div>
      )}

      {/* Rumah Info */}
      {myRumah && (
        <div className="card mb-4">
          <div className="card-header bg-primary text-white">
            <h6 className="m-0 fw-bold">Informasi Rumah</h6>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-4">
                <small className="text-muted">Alamat</small>
                <p className="mb-0 fw-bold">
                  {myRumah.jalan?.nama_jalan} No. {myRumah.nomor_rumah}
                </p>
              </div>
              <div className="col-md-2">
                <small className="text-muted">RT</small>
                <p className="mb-0 fw-bold">{myRumah.rt?.nomor_rt}</p>
              </div>
              <div className="col-md-2">
                <small className="text-muted">Blok</small>
                <p className="mb-0 fw-bold">{myRumah.blok}</p>
              </div>
              <div className="col-md-4">
                <small className="text-muted">Kepala Keluarga</small>
                <p className="mb-0 fw-bold">{myRumah.kepala_keluarga?.nama_lengkap || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="row">
          {/* Left: Pilih Bulan */}
          <div className="col-lg-7 mb-4">
            <div className="card h-100">
              <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                <h6 className="m-0 fw-bold">Pilih Bulan yang Dibayar</h6>
                <div>
                  <button type="button" className="btn btn-sm btn-light me-2" onClick={selectAll}>
                    Pilih Semua
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-light" onClick={deselectAll}>
                    Batal Semua
                  </button>
                </div>
              </div>
              <div className="card-body">
                {tagihanList.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <FiCheck size={48} className="mb-3 text-success" />
                    <p>Tidak ada tagihan yang belum lunas</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th width="50">Pilih</th>
                          <th>Bulan</th>
                          <th className="text-end">Tagihan</th>
                          <th className="text-end">Terbayar</th>
                          <th className="text-end">Sisa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tagihanList.map((t) => {
                          const sisa = t.jumlah_tagihan - t.jumlah_terbayar
                          return (
                            <tr 
                              key={t.id} 
                              className={t.selected ? 'table-primary' : ''}
                              style={{ cursor: 'pointer' }}
                              onClick={() => toggleTagihan(t.id)}
                            >
                              <td>
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={t.selected}
                                  onChange={() => toggleTagihan(t.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </td>
                              <td><strong>{formatBulan(t.bulan)}</strong></td>
                              <td className="text-end">{formatCurrency(t.jumlah_tagihan)}</td>
                              <td className="text-end">{formatCurrency(t.jumlah_terbayar)}</td>
                              <td className="text-end text-danger fw-bold">{formatCurrency(sisa)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Form Pembayaran */}
          <div className="col-lg-5 mb-4">
            <div className="card">
              <div className="card-header bg-primary text-white">
                <h6 className="m-0 fw-bold">Detail Pembayaran</h6>
              </div>
              <div className="card-body">
                {/* Summary */}
                <div className="alert alert-info">
                  <div className="d-flex justify-content-between">
                    <span>Jumlah Bulan:</span>
                    <strong>{selectedCount} bulan</strong>
                  </div>
                  <hr className="my-2" />
                  <div className="d-flex justify-content-between">
                    <span>Total Bayar:</span>
                    <strong className="text-primary fs-5">{formatCurrency(totalSelected)}</strong>
                  </div>
                </div>

                {/* Tanggal Bayar */}
                <div className="mb-3">
                  <label className="form-label">Tanggal Bayar *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={tanggalBayar}
                    onChange={(e) => setTanggalBayar(e.target.value)}
                    required
                  />
                </div>

                {/* Metode */}
                <div className="mb-3">
                  <label className="form-label">Metode Pembayaran *</label>
                  <select
                    className="form-select"
                    value={metode}
                    onChange={(e) => setMetode(e.target.value as any)}
                    required
                  >
                    <option value="transfer">Transfer Bank</option>
                    <option value="tunai">Tunai</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                </div>

                {/* Upload Bukti */}
                <div className="mb-3">
                  <label className="form-label">
                    Upload Bukti Transfer {metode === 'transfer' && '*'}
                  </label>
                  <input
                    type="file"
                    className="form-control"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    disabled={uploading || compressing}
                  />
                  <small className="text-muted">
                    Format: JPG, PNG, PDF. Max 10MB. Gambar akan dikompres otomatis.
                  </small>
                  
                  {compressing && (
                    <div className="mt-2 text-info">
                      <FiImage className="spin me-2" />
                      Mengompres gambar...
                    </div>
                  )}
                  
                  {uploading && (
                    <div className="mt-2 text-primary">
                      <FiLoader className="spin me-2" />
                      Mengupload file...
                    </div>
                  )}
                  
                  {/* Compression Info */}
                  {compressedSize > 0 && originalSize > 0 && !compressing && !uploading && (
                    <div className="mt-2 p-2 bg-light rounded small">
                      <div className="d-flex justify-content-between">
                        <span>Ukuran asli:</span>
                        <span>{formatFileSize(originalSize)}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Setelah kompres:</span>
                        <strong className="text-success">{formatFileSize(compressedSize)}</strong>
                      </div>
                      {originalSize > compressedSize && (
                        <div className="text-success mt-1">
                          <FiCheck className="me-1" />
                          Hemat {Math.round((1 - compressedSize / originalSize) * 100)}%
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Status: File siap diupload (belum diupload ke server) */}
                  {buktiFile && !buktiUrl && !compressing && (
                    <div className="mt-2 text-info">
                      <FiUpload className="me-2" />
                      File siap diupload saat kirim pembayaran
                    </div>
                  )}
                  
                  {/* Status: File sudah diupload */}
                  {buktiUrl && (
                    <div className="mt-2 text-success">
                      <FiCheck className="me-2" />
                      File berhasil diupload
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 ms-2"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          window.open(buktiUrl, '_blank', 'noopener,noreferrer')
                        }}
                      >
                        Lihat
                      </button>
                    </div>
                  )}
                </div>

                {/* Catatan */}
                <div className="mb-3">
                  <label className="form-label">Catatan (opsional)</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Catatan tambahan..."
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={submitting || uploading || compressing || selectedCount === 0}
                >
                  {submitting ? (
                    <>
                      <FiLoader className="spin me-2" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <span className="me-2 fw-bold">Rp</span>
                      Kirim Pembayaran
                    </>
                  )}
                </button>
                
                <p className="text-muted small mt-2 mb-0">
                  * Pembayaran akan diverifikasi oleh pengurus RT/RW
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>

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