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

      // 1. Register user di Supabase Auth
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
          setError('Email sudah terdaftar. Silakan login.')
        } else {
          setError(authError.message)
        }
        return
      }

      if (authData.user) {
        // 2. Buat entry di tabel users (warga_id akan diisi saat onboarding)
        const userInsertData = {
          id: authData.user.id,
          email: data.email,
          nama_lengkap: data.nama_lengkap,
          role: 'warga',
          is_active: true,
          warga_id: null,
        }

        // 3. Cek apakah user sudah ada di tabel users (dari trigger Supabase)
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', authData.user.id)
          .maybeSingle()

        if (existingUser) {
          // User sudah ada, update nama saja
          const { error: updateError } = await supabase
            .from('users')
            .update({ nama_lengkap: data.nama_lengkap })
            .eq('id', authData.user.id)

          if (updateError) {
            console.error('Error updating user profile:', updateError)
          }
        } else {
          // User belum ada, insert baru
          const { error: insertError } = await supabase
            .from('users')
            .insert(userInsertData)

          if (insertError) {
            console.error('Error creating user profile:', insertError)
            setError('Gagal menyimpan data user. Silakan coba lagi.')
            return
          }
        }

        setSuccessMessage('Pendaftaran berhasil! Silakan login dan lengkapi data diri Anda.')
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