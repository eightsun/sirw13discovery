'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { 
  FiUser, FiMail, FiMapPin, FiHome, FiShield, 
  FiLock, FiEye, FiEyeOff, FiCheck, FiAlertCircle 
} from 'react-icons/fi'

interface WargaProfile {
  id: string
  nama_lengkap: string
  nik: string
  tempat_lahir: string
  tanggal_lahir: string
  jenis_kelamin: string
  agama: string
  status_perkawinan: string
  pekerjaan: string
  no_hp: string
  email: string
  status_kependudukan: string
  rumah_id?: string
  rumah?: {
    nomor_rumah: string
    blok: string
    jalan?: { nama_jalan: string }
    rt?: { nomor_rt: string }
  }
}

export default function ProfilPage() {
  const { userData, loading: userLoading } = useUser()
  const supabase = createClient()
  
  const [wargaProfile, setWargaProfile] = useState<WargaProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Jika tidak ada warga_id, coba cari berdasarkan email
        let wargaId = userData?.warga_id
        
        if (!wargaId && userData?.email) {
          // Cari warga berdasarkan email
          const { data: wargaByEmail } = await supabase
            .from('warga')
            .select('id')
            .eq('email', userData.email)
            .single()
          
          if (wargaByEmail) {
            wargaId = wargaByEmail.id
          }
        }

        if (!wargaId) {
          // Tidak ada data warga, tampilkan info dari user saja
          setWargaProfile(null)
          return
        }

        const { data, error: fetchError } = await supabase
          .from('warga')
          .select(`
            id,
            nama_lengkap,
            nik,
            tempat_lahir,
            tanggal_lahir,
            jenis_kelamin,
            agama,
            status_perkawinan,
            pekerjaan,
            no_hp,
            email,
            status_kependudukan,
            rumah_id
          `)
          .eq('id', wargaId)
          .single()

        if (fetchError) {
          console.error('Error fetching warga:', fetchError)
          setWargaProfile(null)
          return
        }

        // Fetch rumah data separately if exists
        if (data?.rumah_id) {
          const { data: rumahData } = await supabase
            .from('rumah')
            .select(`
              nomor_rumah,
              blok,
              jalan:jalan_id (nama_jalan),
              rt:rt_id (nomor_rt)
            `)
            .eq('id', data.rumah_id)
            .single()
          
          if (rumahData) {
            data.rumah = rumahData
          }
        }

        setWargaProfile(data)

      } catch (err) {
        console.error('Error fetching profile:', err)
        setWargaProfile(null)
      } finally {
        setLoading(false)
      }
    }

    if (!userLoading && userData) {
      fetchProfile()
    }
  }, [userLoading, userData])

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validations
    if (!currentPassword) {
      setPasswordError('Masukkan password lama')
      return
    }
    
    if (!newPassword) {
      setPasswordError('Masukkan password baru')
      return
    }
    
    if (newPassword.length < 6) {
      setPasswordError('Password baru minimal 6 karakter')
      return
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi password tidak cocok')
      return
    }

    try {
      setPasswordLoading(true)
      setPasswordError(null)
      setPasswordSuccess(false)

      // Verify current password by trying to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userData?.email || '',
        password: currentPassword,
      })

      if (signInError) {
        setPasswordError('Password lama tidak sesuai')
        return
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) throw updateError

      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      
      // Hide success message after 3 seconds
      setTimeout(() => setPasswordSuccess(false), 3000)

    } catch (err: any) {
      console.error('Error changing password:', err)
      setPasswordError(err.message || 'Gagal mengubah password')
    } finally {
      setPasswordLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatRole = (role: string) => {
    const roles: Record<string, string> = {
      'ketua_rw': 'Ketua RW',
      'wakil_ketua_rw': 'Wakil Ketua RW',
      'sekretaris_rw': 'Sekretaris RW',
      'bendahara_rw': 'Bendahara RW',
      'ketua_rt': 'Ketua RT',
      'sekretaris_rt': 'Sekretaris RT',
      'bendahara_rt': 'Bendahara RT',
      'warga': 'Warga',
    }
    return roles[role] || role
  }

  const formatStatusKependudukan = (status: string) => {
    const statuses: Record<string, string> = {
      'penduduk_tetap': 'Penduduk Tetap',
      'penduduk_kontrak': 'Penduduk Kontrak',
      'pindah': 'Pindah',
      'meninggal': 'Meninggal',
    }
    return statuses[status] || status
  }

  const maskNIK = (nik: string) => {
    if (!nik || nik.length < 10) return nik
    return nik.substring(0, 6) + '********' + nik.substring(14)
  }

  if (userLoading || loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2 text-muted">Memuat data profil...</p>
      </div>
    )
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title mb-0">Profil Saya</h1>
          <p className="text-muted mb-0">Lihat informasi akun dan ubah password</p>
        </div>
      </div>

      <div className="row">
        {/* Left: Profile Information */}
        <div className="col-lg-7 mb-4">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h6 className="m-0 fw-bold">
                <FiUser className="me-2" />
                Informasi Pribadi
              </h6>
            </div>
            <div className="card-body">
              {error ? (
                <div className="alert alert-danger">{error}</div>
              ) : wargaProfile ? (
                <>
                  {/* Avatar and Name */}
                  <div className="text-center mb-4">
                    <div 
                      className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center mb-3"
                      style={{ width: 80, height: 80, fontSize: '2rem' }}
                    >
                      {wargaProfile.nama_lengkap?.charAt(0).toUpperCase()}
                    </div>
                    <h4 className="mb-1">{wargaProfile.nama_lengkap}</h4>
                    <span className="badge bg-primary">{formatRole(userData?.role || 'warga')}</span>
                  </div>

                  <hr />

                  {/* Personal Info */}
                  <div className="row mb-3">
                    <div className="col-sm-4 text-muted">NIK</div>
                    <div className="col-sm-8 fw-medium">{maskNIK(wargaProfile.nik)}</div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-sm-4 text-muted">Tempat, Tgl Lahir</div>
                    <div className="col-sm-8 fw-medium">
                      {wargaProfile.tempat_lahir}, {formatDate(wargaProfile.tanggal_lahir)}
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-sm-4 text-muted">Jenis Kelamin</div>
                    <div className="col-sm-8 fw-medium">
                      {wargaProfile.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-sm-4 text-muted">Agama</div>
                    <div className="col-sm-8 fw-medium">{wargaProfile.agama || '-'}</div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-sm-4 text-muted">Status Perkawinan</div>
                    <div className="col-sm-8 fw-medium">{wargaProfile.status_perkawinan || '-'}</div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-sm-4 text-muted">Pekerjaan</div>
                    <div className="col-sm-8 fw-medium">{wargaProfile.pekerjaan || '-'}</div>
                  </div>

                  <hr />

                  {/* Contact Info */}
                  <h6 className="text-primary mb-3">
                    <FiMail className="me-2" />
                    Kontak
                  </h6>
                  <div className="row mb-3">
                    <div className="col-sm-4 text-muted">Email</div>
                    <div className="col-sm-8 fw-medium">{wargaProfile.email || userData?.email || '-'}</div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-sm-4 text-muted">No. HP</div>
                    <div className="col-sm-8 fw-medium">{wargaProfile.no_hp || '-'}</div>
                  </div>

                  <hr />

                  {/* Address Info */}
                  <h6 className="text-primary mb-3">
                    <FiHome className="me-2" />
                    Alamat
                  </h6>
                  <div className="row mb-3">
                    <div className="col-sm-4 text-muted">Alamat</div>
                    <div className="col-sm-8 fw-medium">
                      {wargaProfile.rumah?.jalan?.nama_jalan} No. {wargaProfile.rumah?.nomor_rumah}
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-sm-4 text-muted">RT / Blok</div>
                    <div className="col-sm-8 fw-medium">
                      RT {wargaProfile.rumah?.rt?.nomor_rt} / {wargaProfile.rumah?.blok}
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-sm-4 text-muted">Status</div>
                    <div className="col-sm-8">
                      <span className={`badge ${
                        wargaProfile.status_kependudukan === 'penduduk_tetap' ? 'bg-success' :
                        wargaProfile.status_kependudukan === 'penduduk_kontrak' ? 'bg-info' :
                        'bg-secondary'
                      }`}>
                        {formatStatusKependudukan(wargaProfile.status_kependudukan)}
                      </span>
                    </div>
                  </div>

                  <div className="alert alert-light mt-4 mb-0">
                    <small className="text-muted">
                      <FiAlertCircle className="me-1" />
                      Untuk mengubah data pribadi, silakan hubungi pengurus RT/RW.
                    </small>
                  </div>
                </>
              ) : (
                <>
                  {/* Fallback: Tampilkan info dari userData jika wargaProfile tidak ada */}
                  <div className="text-center mb-4">
                    <div 
                      className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center mb-3"
                      style={{ width: 80, height: 80, fontSize: '2rem' }}
                    >
                      {userData?.nama_lengkap?.charAt(0).toUpperCase() || userData?.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <h4 className="mb-1">{userData?.nama_lengkap || userData?.email?.split('@')[0] || 'User'}</h4>
                    <span className="badge bg-primary">{formatRole(userData?.role || 'warga')}</span>
                  </div>

                  <hr />

                  <div className="row mb-3">
                    <div className="col-sm-4 text-muted">Email</div>
                    <div className="col-sm-8 fw-medium">{userData?.email || '-'}</div>
                  </div>

                  <div className="alert alert-warning mt-4 mb-0">
                    <small>
                      <FiAlertCircle className="me-1" />
                      Data warga belum terhubung dengan akun ini. Silakan hubungi pengurus RT/RW untuk menghubungkan data.
                    </small>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Change Password */}
        <div className="col-lg-5 mb-4">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h6 className="m-0 fw-bold">
                <FiShield className="me-2" />
                Keamanan Akun
              </h6>
            </div>
            <div className="card-body">
              <p className="text-muted mb-4">
                Untuk keamanan akun Anda, gunakan password yang kuat dan unik.
              </p>

              {passwordSuccess && (
                <div className="alert alert-success d-flex align-items-center">
                  <FiCheck className="me-2" />
                  Password berhasil diubah!
                </div>
              )}

              {passwordError && (
                <div className="alert alert-danger d-flex align-items-center">
                  <FiAlertCircle className="me-2" />
                  {passwordError}
                </div>
              )}

              <form onSubmit={handlePasswordChange}>
                <div className="mb-3">
                  <label className="form-label">Password Lama</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <FiLock />
                    </span>
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      className="form-control"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Masukkan password lama"
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Password Baru</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <FiLock />
                    </span>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className="form-control"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Masukkan password baru"
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                  <small className="text-muted">Minimal 6 karakter</small>
                </div>

                <div className="mb-4">
                  <label className="form-label">Konfirmasi Password Baru</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <FiLock />
                    </span>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="form-control"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi password baru"
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={passwordLoading}
                >
                  {passwordLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <FiLock className="me-2" />
                      Ubah Password
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Account Info */}
          <div className="card mt-4">
            <div className="card-header">
              <h6 className="m-0 fw-bold text-primary">
                <FiMail className="me-2" />
                Informasi Akun
              </h6>
            </div>
            <div className="card-body">
              <div className="row mb-2">
                <div className="col-4 text-muted">Email</div>
                <div className="col-8">{userData?.email}</div>
              </div>
              <div className="row mb-2">
                <div className="col-4 text-muted">Role</div>
                <div className="col-8">{formatRole(userData?.role || 'warga')}</div>
              </div>
              <div className="row">
                <div className="col-4 text-muted">Status</div>
                <div className="col-8">
                  <span className="badge bg-success">Aktif</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}