'use client'

import Link from 'next/link'
import { Insiden, JENIS_INSIDEN_LABELS } from '@/types'
import InsidenStatusBadge from './InsidenStatusBadge'
import TingkatKeparahanBadge from './TingkatKeparahanBadge'
import { FiMapPin, FiCalendar, FiUser, FiImage } from 'react-icons/fi'

interface Props {
  insiden: Insiden & { pelapor_nama?: string }
  showPelapor?: boolean
}

export default function InsidenCard({ insiden, showPelapor = false }: Props) {
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

  const isNearMiss = insiden.jenis === 'hampir_celaka'

  return (
    <Link href={`/insiden/${insiden.id}`} className="text-decoration-none d-block mb-3">
      <div
        className="card border-0 shadow-sm"
        style={{ transition: 'transform 0.15s', cursor: 'pointer' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = '' }}
      >
        {/* Severity colour strip on left edge */}
        <div className="d-flex">
          <div
            style={{
              width: '4px',
              borderRadius: '0.375rem 0 0 0.375rem',
              flexShrink: 0,
              backgroundColor:
                insiden.tingkat_keparahan === 'kritis' ? '#dc2626' :
                insiden.tingkat_keparahan === 'tinggi'  ? '#f97316' :
                insiden.tingkat_keparahan === 'sedang'  ? '#f59e0b' :
                '#10b981',
            }}
          />
          <div className="card-body py-3 flex-grow-1">
            <div className="d-flex gap-3 align-items-start">
              {/* Thumbnail */}
              {insiden.foto_urls && insiden.foto_urls.length > 0 ? (
                <div
                  className="flex-shrink-0 d-none d-sm-block rounded overflow-hidden"
                  style={{ width: 72, height: 56 }}
                >
                  <img
                    src={insiden.foto_urls[0]}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              ) : (
                <div
                  className="flex-shrink-0 d-none d-sm-flex align-items-center justify-content-center rounded bg-light"
                  style={{ width: 72, height: 56 }}
                >
                  <FiImage size={20} className="text-muted" />
                </div>
              )}

              {/* Content */}
              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                {/* Top row: badges + date */}
                <div className="d-flex justify-content-between align-items-start mb-1 gap-2">
                  <div className="d-flex flex-wrap gap-1 align-items-center">
                    <span
                      className="badge"
                      style={{
                        fontSize: '0.6rem',
                        background: isNearMiss ? '#7c3aed' : '#1d4ed8',
                        color: '#fff',
                      }}
                    >
                      {JENIS_INSIDEN_LABELS[insiden.jenis]}
                    </span>
                    <span className="badge bg-light text-dark border" style={{ fontSize: '0.6rem' }}>
                      {insiden.kode_insiden}
                    </span>
                    <InsidenStatusBadge status={insiden.status} />
                    <TingkatKeparahanBadge tingkat={insiden.tingkat_keparahan} showIcon />
                  </div>
                  <small className="text-muted flex-shrink-0" style={{ fontSize: '0.7rem' }}>
                    <FiCalendar size={10} className="me-1" />
                    {formatDate(insiden.tanggal_kejadian)}
                  </small>
                </div>

                {/* Description */}
                <p
                  className="mb-1 text-dark"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.4,
                    fontSize: '0.875rem',
                  }}
                >
                  {insiden.deskripsi}
                </p>

                {/* Footer row */}
                <div className="d-flex justify-content-between align-items-center small text-muted">
                  <span className="d-flex align-items-center gap-1">
                    <FiMapPin size={10} />
                    {insiden.lokasi}
                  </span>
                  {showPelapor && (
                    <span className="d-flex align-items-center gap-1">
                      <FiUser size={10} />
                      {insiden.is_anonim ? 'Anonim' : (insiden as Insiden & { pelapor_nama?: string }).pelapor_nama || '—'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
