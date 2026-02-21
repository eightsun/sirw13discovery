import type { Metadata } from 'next'
import 'bootstrap/dist/css/bootstrap.min.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'SIRW13 - Sistem Informasi RW 13 Permata Discovery',
  description: 'Sistem Informasi Manajemen Warga RW 13 Permata Discovery',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <head>
        <link 
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
