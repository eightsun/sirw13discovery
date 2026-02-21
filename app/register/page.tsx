'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
import { RegisterFormInput } from '@/types'
import { FiMail, FiLock, FiUser, FiUserPlus } from 'react-icons/fi'

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
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
        // 2. Buat entry di tabel users dengan role default 'warga'
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: data.email,
            nama_lengkap: data.nama_lengkap,
            role: 'warga',
            is_active: true,
          })

        if (profileError) {
          console.error('Error creating user profile:', profileError)
          // Tetap lanjutkan karena auth sudah berhasil
        }
      }

      setSuccess(true)
      
      // Redirect ke login setelah 2 detik
      setTimeout(() => {
        router.push('/login')
      }, 2000)
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
                placeholder="Masukkan nama lengkap"
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
              <label htmlFor="email" className="form-label">
                <FiMail className="me-2" />
                Email
              </label>
              <input
                type="email"
                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                id="email"
                placeholder="Masukkan email"
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
                placeholder="Masukkan password"
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
