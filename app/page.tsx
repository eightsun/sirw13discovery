import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  FiUsers, FiDollarSign, FiBookOpen, FiFileText, FiCalendar,
  FiMessageSquare, FiHome, FiShield, FiSmartphone, FiClock,
  FiEye, FiArrowRight, FiCheckCircle, FiMapPin, FiPhone,
  FiMail, FiUserPlus, FiLogIn, FiActivity, FiAward,
} from 'react-icons/fi'

const features = [
  { icon: FiUsers, title: 'Data Warga', desc: 'Kelola data warga, KK, status hunian, dan informasi kependudukan secara digital.', color: '#4e73df' },
  { icon: FiDollarSign, title: 'IPL Management', desc: 'Tagihan bulanan, pembayaran online, monitoring per rumah, dan laporan tunggakan.', color: '#1cc88a' },
  { icon: FiBookOpen, title: 'Keuangan RT/RW', desc: 'Kas masuk & keluar, pengajuan pembelian, budget tahunan, dan laporan keuangan.', color: '#36b9cc' },
  { icon: FiFileText, title: 'Surat Menyurat', desc: 'Surat masuk & keluar, pengumuman, arsip digital, dan distribusi ke warga.', color: '#f6c23e' },
  { icon: FiCalendar, title: 'Kegiatan Warga', desc: 'Jadwal kegiatan, registrasi peserta, notulen, dan dokumentasi aktivitas.', color: '#e74a3b' },
  { icon: FiMessageSquare, title: 'Keluhan Warga', desc: 'Pelaporan keluhan, tracking penanganan, dan transparansi penyelesaian.', color: '#6f42c1' },
]

const stats = [
  { icon: FiUsers, value: '250+', label: 'Warga Terdaftar', color: '#4e73df' },
  { icon: FiHome, value: '200+', label: 'Unit Rumah', color: '#1cc88a' },
  { icon: FiActivity, value: '6', label: 'RT Terlayani', color: '#36b9cc' },
  { icon: FiAward, value: '10+', label: 'Fitur Aktif', color: '#f6c23e' },
]

const steps = [
  { num: '01', title: 'Daftar Akun', desc: 'Buat akun dengan email dan data diri Anda dalam hitungan menit.' },
  { num: '02', title: 'Lengkapi Profil', desc: 'Isi data warga lengkap dan tunggu verifikasi dari pengurus RT/RW.' },
  { num: '03', title: 'Akses Fitur', desc: 'Nikmati seluruh fitur sesuai peran Anda — warga, RT, atau RW.' },
]

const benefits = [
  { icon: FiEye, title: 'Transparan', desc: 'Semua warga bisa pantau pembayaran IPL dan keuangan RT/RW secara real-time.' },
  { icon: FiClock, title: 'Real-time', desc: 'Data selalu terkini dengan notifikasi langsung ke pengurus terkait.' },
  { icon: FiShield, title: 'Aman & Terpercaya', desc: 'Data terenkripsi dengan akses berbasis peran — setiap orang hanya lihat sesuai haknya.' },
  { icon: FiSmartphone, title: 'Mobile-friendly', desc: 'Akses dari HP kapan saja, di mana saja. Tidak perlu install aplikasi.' },
]

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="landing-page">
      {/* ==================== HERO ==================== */}
      <section className="lp-hero">
        <div className="lp-hero-bg">
          {/* Floating decorative elements */}
          <div className="lp-float lp-float-1"><FiHome /></div>
          <div className="lp-float lp-float-2"><FiFileText /></div>
          <div className="lp-float lp-float-3"><FiDollarSign /></div>
          <div className="lp-float lp-float-4"><FiUsers /></div>
          <div className="lp-float lp-float-5"><FiShield /></div>
        </div>

        <div className="container position-relative" style={{ zIndex: 2 }}>
          <div className="row justify-content-center">
            <div className="col-lg-9 text-center">
              <div className="lp-hero-badge">
                <FiActivity size={14} /> Sistem Informasi Warga Digital
              </div>
              <h1 className="lp-hero-title">
                RW 013<br />
                <span className="lp-hero-accent">Permata Discovery</span>
              </h1>
              <p className="lp-hero-sub">
                Kelola IPL, data warga, keuangan, surat menyurat, dan administrasi RT/RW
                dalam satu platform digital yang transparan dan mudah diakses.
              </p>
              <div className="d-flex justify-content-center gap-3 flex-wrap">
                <Link href="/login" className="btn lp-btn-outline">
                  <FiLogIn size={18} /> Masuk
                </Link>
                <Link href="/register" className="btn lp-btn-solid">
                  <FiUserPlus size={18} /> Daftar Sekarang
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="lp-wave">
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
            <path d="M0,64 C360,120 720,0 1080,64 C1260,96 1380,80 1440,64 L1440,120 L0,120 Z" fill="#ffffff" />
          </svg>
        </div>
      </section>

      {/* ==================== STATS ==================== */}
      <section className="lp-section lp-section-white">
        <div className="container">
          <div className="row g-4 justify-content-center">
            {stats.map((s, i) => (
              <div key={i} className="col-6 col-md-3">
                <div className="lp-stat-card text-center">
                  <div className="lp-stat-icon" style={{ background: `${s.color}15`, color: s.color }}>
                    <s.icon size={24} />
                  </div>
                  <div className="lp-stat-value">{s.value}</div>
                  <div className="lp-stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FEATURES ==================== */}
      <section className="lp-section lp-section-grey">
        <div className="container">
          <div className="text-center mb-5">
            <div className="lp-section-tag">Fitur Lengkap</div>
            <h2 className="lp-section-title">Semua yang Dibutuhkan Warga & Pengurus</h2>
            <p className="lp-section-subtitle">Satu platform untuk seluruh kebutuhan administrasi lingkungan.</p>
          </div>
          <div className="row g-4">
            {features.map((f, i) => (
              <div key={i} className="col-md-6 col-lg-4">
                <div className="lp-feature-card">
                  <div className="lp-feature-icon" style={{ background: `${f.color}12`, color: f.color }}>
                    <f.icon size={24} />
                  </div>
                  <h5 className="lp-feature-title">{f.title}</h5>
                  <p className="lp-feature-desc">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section className="lp-section lp-section-white">
        <div className="container">
          <div className="text-center mb-5">
            <div className="lp-section-tag">Mudah & Cepat</div>
            <h2 className="lp-section-title">Cara Bergabung</h2>
            <p className="lp-section-subtitle">Tiga langkah sederhana untuk mulai menggunakan SIRW13.</p>
          </div>
          <div className="row g-4 justify-content-center">
            {steps.map((s, i) => (
              <div key={i} className="col-md-4">
                <div className="lp-step-card text-center">
                  <div className="lp-step-num">{s.num}</div>
                  {i < steps.length - 1 && <div className="lp-step-connector d-none d-md-block" />}
                  <h5 className="lp-step-title">{s.title}</h5>
                  <p className="lp-step-desc">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== BENEFITS ==================== */}
      <section className="lp-section lp-section-grey">
        <div className="container">
          <div className="text-center mb-5">
            <div className="lp-section-tag">Keunggulan</div>
            <h2 className="lp-section-title">Mengapa SIRW13?</h2>
            <p className="lp-section-subtitle">Dibangun untuk kebutuhan nyata pengelolaan warga modern.</p>
          </div>
          <div className="row g-4">
            {benefits.map((b, i) => (
              <div key={i} className="col-md-6">
                <div className="lp-benefit-card d-flex align-items-start gap-3">
                  <div className="lp-benefit-icon">
                    <b.icon size={22} />
                  </div>
                  <div>
                    <h5 className="lp-benefit-title">{b.title}</h5>
                    <p className="lp-benefit-desc">{b.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== TRUST ==================== */}
      <section className="lp-section lp-section-white">
        <div className="container">
          <div className="text-center">
            <div className="lp-trust-badge">
              <FiHome size={32} />
            </div>
            <h3 className="lp-trust-title">RW 013 Permata Discovery</h3>
            <p className="lp-trust-subtitle">Perumahan Permata Discovery, Kecamatan Cerme, Kabupaten Gresik</p>
            <div className="d-flex justify-content-center gap-3 flex-wrap mt-4">
              <span className="lp-trust-pill"><FiCheckCircle size={14} /> Terverifikasi</span>
              <span className="lp-trust-pill"><FiShield size={14} /> Data Aman</span>
              <span className="lp-trust-pill"><FiUsers size={14} /> Akses Berbasis Peran</span>
            </div>
            <p className="lp-trust-note mt-4">
              Dikelola oleh pengurus RW 013 untuk seluruh warga Permata Discovery.<br />
              Didukung oleh <strong>Eightsun Indonesia</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="lp-cta">
        <div className="container text-center position-relative" style={{ zIndex: 2 }}>
          <h2 className="lp-cta-title">Bergabung dengan Warga Digital<br />Permata Discovery</h2>
          <p className="lp-cta-sub">Daftar sekarang dan nikmati kemudahan administrasi warga dalam genggaman.</p>
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <Link href="/login" className="btn lp-btn-outline">
              <FiLogIn size={18} /> Masuk
            </Link>
            <Link href="/register" className="btn lp-btn-solid">
              <FiUserPlus size={18} /> Daftar Sekarang <FiArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="lp-footer">
        <div className="container">
          <div className="row g-4">
            <div className="col-md-5">
              <h5 className="lp-footer-brand">SIRW13</h5>
              <p className="lp-footer-desc">
                Sistem Informasi RW 013 Permata Discovery — platform digital untuk
                transparansi dan kemudahan administrasi warga.
              </p>
            </div>
            <div className="col-md-3">
              <h6 className="lp-footer-heading">Navigasi</h6>
              <ul className="lp-footer-links">
                <li><Link href="/login">Masuk</Link></li>
                <li><Link href="/register">Daftar</Link></li>
              </ul>
            </div>
            <div className="col-md-4">
              <h6 className="lp-footer-heading">Kontak</h6>
              <ul className="lp-footer-links">
                <li><FiMapPin size={14} /> Perum. Permata Discovery, Cerme, Gresik</li>
                <li><FiMail size={14} /> admin@permatadiscovery.com</li>
              </ul>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <span>&copy; {new Date().getFullYear()} SIRW13 Permata Discovery. All rights reserved.</span>
            <span>Dibuat oleh <strong>Eightsun Indonesia</strong></span>
          </div>
        </div>
      </footer>
    </div>
  )
}
