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
  FiX
} from 'react-icons/fi'

interface MenuItem {
  href: string
  label: string
  icon: React.ReactNode
  roles?: string[] // Jika kosong, semua role bisa akses
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

  // Menu configuration
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
        {
          href: '/rumah',
          label: 'Daftar Rumah',
          icon: <FiHome />,
        },
        {
          href: '/warga/tambah',
          label: 'Tambah Warga',
          icon: <FiUserPlus />,
        },
        {
          href: '/admin/verifikasi-warga',
          label: 'Verifikasi Warga',
          icon: <FiUserCheck />,
          roles: ['ketua_rw', 'ketua_rt']
        },
      ],
    },
    {
      id: 'ipl',
      title: 'IPL',
      items: [
        {
          href: '/ipl',
          label: 'Tagihan IPL',
          icon: <FiCreditCard />,
        },
        {
          href: '/ipl/bayar',
          label: 'Bayar IPL',
          icon: <FiCreditCard />,
        },
        {
          href: '/ipl/verifikasi',
          label: 'Verifikasi',
          icon: <FiFileText />,
          roles: ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'koordinator_rw', 'ketua_rt', 'sekretaris_rt', 'bendahara_rt']
        },
        {
          href: '/admin/ipl/tarif',
          label: 'Pengaturan Tarif',
          icon: <FiSettings />,
          roles: ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'koordinator_rw']
        },
      ],
    },
    {
      id: 'administrasi',
      title: 'Administrasi',
      items: [
        {
          href: '/kegiatan',
          label: 'Kegiatan',
          icon: <FiCalendar />,
        },
        {
          href: '/surat',
          label: 'Arsip Surat',
          icon: <FiFileText />,
        },
        {
          href: '/usaha',
          label: 'Direktori Usaha',
          icon: <FiBriefcase />,
        },
        {
          href: '/keluhan',
          label: 'Keluhan Warga',
          icon: <FiMessageSquare />,
        },
      ],
    },
    {
      id: 'keuangan',
      title: 'Keuangan',
      items: [
        {
          href: '/keuangan',
          label: 'Dashboard Kas',
          icon: <FiBarChart2 />,
          roles: ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'koordinator_rw', 'ketua_rt', 'sekretaris_rt', 'bendahara_rt']
        },
        {
          href: '/keuangan/pengajuan',
          label: 'Pengajuan',
          icon: <FiFileText />,
          roles: ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'koordinator_rw', 'ketua_rt', 'sekretaris_rt', 'bendahara_rt']
        },
        {
          href: '/keuangan/transaksi',
          label: 'Transaksi Kas',
          icon: <FiCreditCard />,
          roles: ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'koordinator_rw']
        },
        {
          href: '/keuangan/budget',
          label: 'Budget Tahunan',
          icon: <FiDatabase />,
          roles: ['ketua_rw', 'wakil_ketua_rw', 'bendahara_rw', 'koordinator_rw']
        },
        {
          href: '/keuangan/laporan',
          label: 'Laporan Bulanan',
          icon: <FiFileText />,
        },
      ],
    },
    {
      id: 'lainnya',
      title: 'Lainnya',
      items: [
        {
          href: '/notifikasi',
          label: 'Notifikasi',
          icon: <FiBell />,
        },
        {
          href: '/admin/roles',
          label: 'Kelola Pengurus',
          icon: <FiUsers />,
          roles: ['ketua_rw']
        },
        {
          href: '/pengaturan',
          label: 'Pengaturan',
          icon: <FiSettings />,
        },
      ],
    },
  ]

  // Filter menu berdasarkan role
  const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
    return items.filter(item => {
      if (!item.roles || item.roles.length === 0) return true
      if (!role) return false
      return item.roles.includes(role)
    })
  }

  const isActive = (href: string): boolean => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  // Determine which section contains the active page
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

  // Collapsible sections state - default: only active section open
  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    const active = getActiveSectionId()
    return active ? new Set([active]) : new Set<string>()
  })

  // When pathname changes, ensure the active section is open
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
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="sidebar-overlay d-md-none"
          onClick={onClose}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* Close button for mobile */}
        <button
          className="btn btn-link text-white position-absolute d-md-none"
          style={{ top: '10px', right: '10px', zIndex: 1001 }}
          onClick={onClose}
        >
          <FiX size={24} />
        </button>

        {/* Fixed Header */}
        <div className="flex-shrink-0">
          <Link href="/dashboard" className="sidebar-brand" onClick={onClose}>
            🏘️ SIRW13
          </Link>
        </div>

        <hr className="sidebar-divider flex-shrink-0 my-2" />

        {/* Scrollable Menu Area */}
        <nav className="flex-grow-1" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
          {menuSections.map((section, sectionIndex) => {
            const filteredItems = filterMenuItems(section.items)

            if (filteredItems.length === 0) return null

            const isSectionOpen = openSections.has(section.id)
            const hasActiveItem = filteredItems.some(item => isActive(item.href))

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
                    size={12}
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
                        <span>{item.label}</span>
                      </Link>
                    </div>
                  ))}
                </div>

                {sectionIndex < menuSections.length - 1 && (
                  <hr className="sidebar-divider my-1" />
                )}
              </div>
            )
          })}
        </nav>

        {/* Fixed Footer */}
        <div className="flex-shrink-0">
          <hr className="sidebar-divider my-2" />
          <div className="px-3 py-2">
            <small className="text-white-50">
              RW 013 Desa Banjarsari
              <br />
              Kec. Manyar, Kab. Gresik
              <br />
              Permata Discovery
            </small>
            <div className="mt-2 pt-2 border-top border-light border-opacity-25" style={{ fontSize: '0.75rem' }}>
              <span className="text-white-50">SIRW13 develop by </span>
              <a href="https://wa.me/6285716876881" target="_blank" rel="noopener noreferrer" className="text-white fw-bold text-decoration-none" style={{ borderBottom: '1px dotted rgba(255,255,255,0.5)' }}>
                eightsun
              </a>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
