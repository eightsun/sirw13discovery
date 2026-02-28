'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
import { RegisterFormInput } from '@/types'
import { FiMail, FiLock, FiUser, FiUserPlus, FiCreditCard } from 'react-icons/fi'

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  
  const supabase = createClient()
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormInput>()
  
  const password = watch('password')

  const onSubmit = async (data: RegisterFormInput) => {
    try {
      setIsLoading(true)
      setError(null)

      // 1. Register user di Supabase Auth DULU
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            nama_lengkap: data.nama_lengkap,
            nik: data.nik,
          },
        },
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('Email sudah terdaftar')
        } else {
          setError(authError.message)
        }
        return
      }

      if (authData.user) {
        // 2. Sekarang user sudah authenticated, cek NIK di tabel warga
        const { data: existingWarga, error: wargaError } = await supabase
          .from('warga')
          .select('id, nama_lengkap, email, rumah_id')
          .eq('nik', data.nik)
          .eq('is_active', true)
          .maybeSingle()

        if (wargaError) {
          console.error('Error checking NIK:', wargaError)
        }

        // 3. Cek apakah warga ini sudah punya user account lain
        if (existingWarga) {
          const { data: existingUserWithWarga } = await supabase
            .from('users')
            .select('id')
            .eq('warga_id', existingWarga.id)
            .maybeSingle()

          if (existingUserWithWarga) {
            // NIK sudah dipakai user lain, tapi auth sudah terlanjur dibuat
            // Tetap lanjutkan tanpa link ke warga (akan onboarding)
            console.warn('NIK already linked to another user')
          }
        }

        // 4. Siapkan data user
        const userInsertData: {
          id: string
          email: string
          nama_lengkap: string
          role: string
          is_active: boolean
          warga_id: string | null
        } = {
          id: authData.user.id,
          email: data.email,
          nama_lengkap: data.nama_lengkap,
          role: 'warga',
          is_active: true,
          warga_id: null,
        }

        // 5. Jika NIK ditemukan dan belum dipakai user lain, link langsung
        if (existingWarga) {
          const { data: existingUserWithWarga } = await supabase
            .from('users')
            .select('id')
            .eq('warga_id', existingWarga.id)
            .maybeSingle()

          if (!existingUserWithWarga) {
            userInsertData.warga_id = existingWarga.id

            // Update email di tabel warga jika belum ada
            if (!existingWarga.email || existingWarga.email !== data.email) {
              await supabase
                .from('warga')
                .update({ email: data.email })
                .eq('id', existingWarga.id)
            }

            setSuccessMessage(`Data Anda (${existingWarga.nama_lengkap}) berhasil ditemukan dan dihubungkan dengan akun baru. Anda tidak perlu mengisi data lagi.`)
          } else {
            setSuccessMessage('Pendaftaran berhasil! Silakan lengkapi data warga setelah login.')
          }
        } else {
          setSuccessMessage('Pendaftaran berhasil! Silakan lengkapi data warga setelah login.')
        }

        // 6. Cek apakah user sudah ada di tabel users (dari trigger Supabase)
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', authData.user.id)
          .maybeSingle()

        if (existingUser) {
          // User sudah ada, update dengan warga_id
          const { error: updateError } = await supabase
            .from('users')
            .update({
              nama_lengkap: data.nama_lengkap,
              warga_id: userInsertData.warga_id,
            })
            .eq('id', authData.user.id)

          if (updateError) {
            console.error('Error updating user profile:', updateError)
            setError('Database error saving new user')
            return
          }
        } else {
          // User belum ada, insert baru
          const { error: insertError } = await supabase
            .from('users')
            .insert(userInsertData)

          if (insertError) {
            console.error('Error creating user profile:', insertError)
            setError('Database error saving new user')
            return
          }
        }
      }

      setSuccess(true)
      
      // Redirect ke login setelah 3 detik
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <h1>🏘️ SIRW13</h1>
            <p>Sistem Informasi RW 13 Permata Discovery</p>
          </div>
          <div className="auth-body text-center">
            <div className="mb-4">
              <div className="display-1 text-success">✓</div>
            </div>
            <h5 className="text-dark mb-3">Pendaftaran Berhasil!</h5>
            <p className="text-muted">
              {successMessage}
              <br /><br />
              Silakan cek email Anda untuk verifikasi akun.
              Anda akan dialihkan ke halaman login...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🏘️ SIRW13</h1>
          <p>Sistem Informasi RW 13 Permata Discovery</p>
        </div>
        
        <div className="auth-body">
          <h5 className="text-center mb-4 text-dark">Daftar Akun Baru</h5>
          
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-3">
              <label htmlFor="nama_lengkap" className="form-label">
                <FiUser className="me-2" />
                Nama Lengkap
              </label>
              <input
                type="text"
                className={`form-control ${errors.nama_lengkap ? 'is-invalid' : ''}`}
                id="nama_lengkap"
                placeholder="Masukkan nama lengkap sesuai KTP"
                {...register('nama_lengkap', {
                  required: 'Nama lengkap wajib diisi',
                  minLength: {
                    value: 3,
                    message: 'Nama minimal 3 karakter',
                  },
                })}
              />
              {errors.nama_lengkap && (
                <div className="invalid-feedback">{errors.nama_lengkap.message}</div>
              )}
            </div>

            <div className="mb-3">
              <label htmlFor="nik" className="form-label">
                <FiCreditCard className="me-2" />
                NIK (Nomor KTP)
              </label>
              <input
                type="text"
                className={`form-control ${errors.nik ? 'is-invalid' : ''}`}
                id="nik"
                placeholder="Masukkan 16 digit NIK"
                maxLength={16}
                {...register('nik', {
                  required: 'NIK wajib diisi',
                  pattern: {
                    value: /^[0-9]{16}$/,
                    message: 'NIK harus 16 digit angka',
                  },
                })}
              />
              {errors.nik && (
                <div className="invalid-feedback">{errors.nik.message}</div>
              )}
              <small className="text-muted">
                Jika NIK Anda sudah terdaftar oleh pengurus, akun akan otomatis terhubung dengan data warga.
              </small>
            </div>
            
            <div className="mb-3">
              <label htmlFor="email" className="form-label">
                <FiMail className="me-2" />
                Email
              </label>
              <input
                type="email"
                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                id="email"
                placeholder="Masukkan email aktif"
                {...register('email', {
                  required: 'Email wajib diisi',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Format email tidak valid',
                  },
                })}
              />
              {errors.email && (
                <div className="invalid-feedback">{errors.email.message}</div>
              )}
            </div>
            
            <div className="mb-3">
              <label htmlFor="password" className="form-label">
                <FiLock className="me-2" />
                Password
              </label>
              <input
                type="password"
                className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                id="password"
                placeholder="Minimal 6 karakter"
                {...register('password', {
                  required: 'Password wajib diisi',
                  minLength: {
                    value: 6,
                    message: 'Password minimal 6 karakter',
                  },
                })}
              />
              {errors.password && (
                <div className="invalid-feedback">{errors.password.message}</div>
              )}
            </div>
            
            <div className="mb-4">
              <label htmlFor="confirmPassword" className="form-label">
                <FiLock className="me-2" />
                Konfirmasi Password
              </label>
              <input
                type="password"
                className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                id="confirmPassword"
                placeholder="Ulangi password"
                {...register('confirmPassword', {
                  required: 'Konfirmasi password wajib diisi',
                  validate: (value) =>
                    value === password || 'Password tidak cocok',
                })}
              />
              {errors.confirmPassword && (
                <div className="invalid-feedback">{errors.confirmPassword.message}</div>
              )}
            </div>
            
            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Memproses...
                </>
              ) : (
                <>
                  <FiUserPlus className="me-2" />
                  Daftar
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="auth-footer">
          <p className="mb-0">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-primary">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}