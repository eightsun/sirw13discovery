'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import {
  FiHome,
  FiUsers,
  FiUserPlus,
  FiSettings,
  FiDatabase,
  FiFileText,
  FiCreditCard,
  FiCalendar,
  FiMessageSquare,
  FiBarChart2,
  FiBriefcase,
  FiUserCheck,
  FiBell,
  FiChevronDown,
  FiX,
  FiAlertOctagon,
} from 'react-icons/fi'

interface MenuItem {
  href: string
  label: string
  icon: React.ReactNode
  roles?: string[]
  badge?: number
}

interface MenuSection {
  id: string
  title: string
  items: MenuItem[]
}

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { role, isRW, isPengurus } = useUser()

  const [openInsidenCount, setOpenInsidenCount] = useState(0)

  useEffect(() => {
    if (!isPengurus) return
    fetch('/api/insiden/stats')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.open) setOpenInsidenCount(d.open) })
      .catch(() => {})
  }, [isPengurus])

  const menuSections: MenuSection[] = [
    {
      id: 'utama',
      title: 'Utama',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: <FiHome /> },
      ],
    },
    {
      id: 'warga',
      title: 'Data Warga',
      items: [
        { href: '/warga', label: 'Daftar Warga', icon: <FiUsers /> },
        { href: '/rumah', label: 'Daftar Rumah', icon: <FiHome /> },
        { href: '/warga/tambah', label: 'Tambah Warga', icon: <FiUserPlus /> },
        { href: '/admin/verifikasi-warga', label: 'Verifikasi Warga', icon: <FiUserCheck />, roles: ['ketua_rw', 'ketua_rt'] },
      ],
    },
    {
      id: 'ipl',
      title: 'IPL',
      items: [
        { href: '/ipl', label: 'Tagihan IPL', icon: <FiCreditCard /> },
        { href: '/ipl/bayar', label: 'Bayar IPL', icon: <FiCreditCard /> },
        { href: '/ipl/dashboard', label: 'Dashboard IPL', icon: <FiBarChart2 />, roles: ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'ketua_rt', 'sekretaris_rt', 'bendahara_rt'] },
        { href: '/ipl/monitoring', label: 'Monitoring IPL', icon: <FiBarChart2 />, roles: ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'ketua_rt', 'sekretaris_rt', 'bendahara_rt'] },
        { href: '/ipl/verifikasi', label: 'Verifikasi', icon: <FiFileText />, roles: ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'koordinator_rw', 'ketua_rt', 'sekretaris_rt', 'bendahara_rt'] },
        { href: '/admin/ipl/tarif', label: 'Pengaturan Tarif', icon: <FiSettings />, roles: ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'koordinator_rw'] },
      ],
    },
    {
      id: 'administrasi',
      title: 'Administrasi',
      items: [
        { href: '/kegiatan', label: 'Kegiatan', icon: <FiCalendar /> },
        { href: '/surat', label: 'Arsip Surat', icon: <FiFileText /> },
        { href: '/usaha', label: 'Direktori Usaha', icon: <FiBriefcase /> },
        { href: '/keluhan', label: 'Keluhan Warga', icon: <FiMessageSquare /> },
        { href: '/insiden', label: 'Insiden & Keselamatan', icon: <FiAlertOctagon />, badge: openInsidenCount },
      ],
    },
    {
      id: 'keuangan',
      title: 'Keuangan',
      items: [
        { href: '/keuangan', label: 'Dashboard Kas', icon: <FiBarChart2 />, roles: ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'koordinator_rw', 'ketua_rt', 'sekretaris_rt', 'bendahara_rt'] },
        { href: '/keuangan/pengajuan', label: 'Pengajuan', icon: <FiFileText />, roles: ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'koordinator_rw', 'ketua_rt', 'sekretaris_rt', 'bendahara_rt'] },
        { href: '/keuangan/transaksi', label: 'Transaksi Kas', icon: <FiCreditCard />, roles: ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'koordinator_rw'] },
        { href: '/keuangan/budget', label: 'Budget Tahunan', icon: <FiDatabase />, roles: ['ketua_rw', 'wakil_ketua_rw', 'bendahara_rw', 'koordinator_rw'] },
        { href: '/keuangan/laporan', label: 'Laporan Bulanan', icon: <FiFileText /> },
      ],
    },
    {
      id: 'lainnya',
      title: 'Lainnya',
      items: [
        { href: '/notifikasi', label: 'Notifikasi', icon: <FiBell /> },
        { href: '/admin/roles', label: 'Kelola Pengurus', icon: <FiUsers />, roles: ['ketua_rw'] },
        { href: '/pengaturan', label: 'Pengaturan', icon: <FiSettings /> },
      ],
    },
  ]

  const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
    return items.filter(item => {
      if (!item.roles || item.roles.length === 0) return true
      if (!role) return false
      return item.roles.includes(role)
    })
  }

  const isActive = (href: string): boolean => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const getActiveSectionId = useCallback((): string | null => {
    for (const section of menuSections) {
      const filtered = section.items.filter(item => {
        if (!item.roles || item.roles.length === 0) return true
        if (!role) return false
        return item.roles.includes(role)
      })
      for (const item of filtered) {
        if (isActive(item.href)) return section.id
      }
    }
    return null
  }, [pathname, role])

  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    const active = getActiveSectionId()
    return active ? new Set([active]) : new Set<string>()
  })

  useEffect(() => {
    const activeId = getActiveSectionId()
    if (activeId && !openSections.has(activeId)) {
      setOpenSections(prev => {
        const next = new Set(prev)
        next.add(activeId)
        return next
      })
    }
  }, [pathname])

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  return (
    <>
      {isOpen && (
        <div className="sidebar-overlay d-md-none" onClick={onClose} />
      )}

      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        {/* Mobile close */}
        <button
          className="btn btn-link text-white position-absolute d-md-none"
          style={{ top: '12px', right: '12px', zIndex: 1001, opacity: 0.5 }}
          onClick={onClose}
        >
          <FiX size={20} />
        </button>

        {/* Brand */}
        <Link href="/dashboard" className="sidebar-brand" onClick={onClose}>
          <span className="sidebar-brand-dot">
            <FiHome size={14} color="#fff" />
          </span>
          SIRW13
        </Link>

        <hr className="sidebar-divider" />

        {/* Scrollable Menu */}
        <nav className="flex-grow-1" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
          {menuSections.map((section) => {
            const filteredItems = filterMenuItems(section.items)
            if (filteredItems.length === 0) return null

            const isSectionOpen = openSections.has(section.id)

            return (
              <div key={section.id}>
                <button
                  className="sidebar-heading sidebar-heading-btn"
                  onClick={() => toggleSection(section.id)}
                  type="button"
                >
                  <span>{section.title}</span>
                  <FiChevronDown
                    className={`sidebar-chevron ${isSectionOpen ? 'open' : ''}`}
                    size={11}
                  />
                </button>

                <div className={`sidebar-section-items ${isSectionOpen ? 'open' : ''}`}>
                  {filteredItems.map((item, itemIndex) => (
                    <div className="nav-item" key={itemIndex}>
                      <Link
                        href={item.href}
                        className={`nav-link ${isActive(item.href) ? 'active' : ''}`}
                        onClick={onClose}
                      >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="flex-grow-1">{item.label}</span>
                        {item.badge && item.badge > 0 ? (
                          <span
                            style={{
                              background: '#ef4444',
                              color: '#fff',
                              fontSize: '0.6rem',
                              fontWeight: 700,
                              borderRadius: '10px',
                              padding: '1px 5px',
                              lineHeight: '1.4',
                              minWidth: '16px',
                              textAlign: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        ) : null}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0">
          <hr className="sidebar-divider" />
          <div className="px-3 py-2">
            <small style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem', lineHeight: 1.5, display: 'block' }}>
              RW 013 Permata Discovery
              <br />
              Kec. Cerme, Kab. Gresik
            </small>
            <div className="mt-1 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.675rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>by </span>
              <a href="https://wa.me/6285716876881" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontWeight: 700 }}>
                eightsun
              </a>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
