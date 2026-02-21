'use client'

export const dynamic = 'force-dynamic'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
import { LoginFormInput } from '@/types'
import { FiMail, FiLock, FiLogIn } from 'react-icons/fi'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInput>()

  const onSubmit = async (data: LoginFormInput) => {
    try {
      setIsLoading(true)
      setError(null)

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('Email atau password salah')
        } else {
          setError(authError.message)
        }
        return
      }

      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-body">
      <h5 className="text-center mb-4 text-dark">Masuk ke Akun Anda</h5>
      
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)}>
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
        
        <div className="mb-4">
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
              <FiLogIn className="me-2" />
              Masuk
            </>
          )}
        </button>
      </form>
    </div>
  )
}

function LoginFormFallback() {
  return (
    <div className="auth-body text-center py-5">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🏘️ SIRW13</h1>
          <p>Sistem Informasi RW 13 Permata Discovery</p>
        </div>
        
        <Suspense fallback={<LoginFormFallback />}>
          <LoginForm />
        </Suspense>
        
        <div className="auth-footer">
          <p className="mb-0">
            Belum punya akun?{' '}
            <Link href="/register" className="text-primary">
              Daftar di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
