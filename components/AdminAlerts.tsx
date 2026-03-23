'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { FiUserCheck, FiCreditCard, FiMessageSquare, FiFileText, FiArrowRight } from 'react-icons/fi'

interface AlertItem {
  label: string
  count: number
  href: string
  icon: React.ElementType
  color: string
}

export default function AdminAlerts() {
  const { isPengurus, isRW, userData } = useUser()
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isPengurus || !userData?.id) return

    const fetchAlerts = async () => {
      const supabase = createClient()
      const items: AlertItem[] = []

      try {
        // Pending verifikasi warga
        const { count: pendingVerif } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'warga')
          .eq('is_verified', false)
          .eq('is_active', true)
          .not('warga_id', 'is', null)

        if (pendingVerif && pendingVerif > 0) {
          items.push({
            label: 'Verifikasi Warga',
            count: pendingVerif,
            href: '/admin/verifikasi-warga',
            icon: FiUserCheck,
            color: '#f6c23e',
          })
        }

        // Pending verifikasi pembayaran IPL
        const { count: pendingIPL } = await supabase
          .from('pembayaran_ipl')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')

        if (pendingIPL && pendingIPL > 0) {
          items.push({
            label: 'Verifikasi Pembayaran',
            count: pendingIPL,
            href: '/ipl/verifikasi',
            icon: FiCreditCard,
            color: '#4e73df',
          })
        }

        // Keluhan belum ditangani
        const { count: openKeluhan } = await supabase
          .from('keluhan')
          .select('*', { count: 'exact', head: true })
          .in('status', ['baru', 'diproses'])

        if (openKeluhan && openKeluhan > 0) {
          items.push({
            label: 'Keluhan Aktif',
            count: openKeluhan,
            href: '/keluhan',
            icon: FiMessageSquare,
            color: '#e74a3b',
          })
        }

        // Pengajuan menunggu approval (if RW level)
        if (isRW) {
          const { count: pendingPengajuan } = await supabase
            .from('pengajuan')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending')

          if (pendingPengajuan && pendingPengajuan > 0) {
            items.push({
              label: 'Pengajuan Pending',
              count: pendingPengajuan,
              href: '/keuangan/pengajuan',
              icon: FiFileText,
              color: '#36b9cc',
            })
          }
        }
      } catch (err) {
        // Silently fail - some tables might not exist yet
        console.error('AdminAlerts:', err)
      }

      setAlerts(items)
      setLoading(false)
    }

    fetchAlerts()
  }, [isPengurus, isRW, userData?.id])

  if (!isPengurus || loading || alerts.length === 0) return null

  return (
    <div className="row g-2 mb-4">
      {alerts.map((item, i) => (
        <div key={i} className="col-6 col-lg-3">
          <Link
            href={item.href}
            className="d-flex align-items-center gap-3 text-decoration-none p-3 rounded-3"
            style={{
              background: '#fff',
              border: `1px solid var(--card-border)`,
              borderLeft: `4px solid ${item.color}`,
              transition: 'box-shadow 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)' }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none' }}
          >
            <div
              className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
              style={{ width: '36px', height: '36px', background: `${item.color}12`, color: item.color }}
            >
              <item.icon size={16} />
            </div>
            <div className="flex-grow-1 min-width-0">
              <div className="fw-bold" style={{ fontSize: '1.25rem', color: item.color, lineHeight: 1 }}>
                {item.count}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-body)', lineHeight: 1.2 }}>
                {item.label}
              </div>
            </div>
            <FiArrowRight size={14} style={{ color: 'var(--text-body)', opacity: 0.3 }} />
          </Link>
        </div>
      ))}
    </div>
  )
}
