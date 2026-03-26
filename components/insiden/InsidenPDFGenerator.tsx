'use client'

import { useCallback } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { FiDownload } from 'react-icons/fi'
import {
  InsidenDetail,
  JENIS_INSIDEN_LABELS,
  DAMPAK_INSIDEN_LABELS,
  TINGKAT_KEPARAHAN_LABELS,
  STATUS_INSIDEN_LABELS,
  STATUS_TINDAKAN_LABELS,
} from '@/types'

interface Props {
  data: InsidenDetail
  ketuaRW?: string
  disabled?: boolean
}

export default function InsidenPDFGenerator({ data, ketuaRW = 'Ketua RW 013', disabled }: Props) {
  const generate = useCallback(() => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 14
    let y = 15

    // ── Page 1: Incident Summary ─────────────────────────────────────

    // Header
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('RW 013 Permata Discovery · Kec. Kebomas · Gresik', pageWidth / 2, y, { align: 'center' })
    y += 6

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    const title = data.jenis === 'hampir_celaka'
      ? 'LAPORAN HAMPIR CELAKA (NEAR MISS)'
      : 'LAPORAN INSIDEN'
    doc.text(title, pageWidth / 2, y, { align: 'center' })
    y += 5

    doc.setLineWidth(0.5)
    doc.line(margin, y, pageWidth - margin, y)
    y += 7

    // Info Table
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('INFORMASI INSIDEN', margin, y)
    y += 4

    const tanggal = new Date(data.tanggal_kejadian).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
    const waktu = data.waktu_kejadian ? data.waktu_kejadian.slice(0, 5) : '-'

    autoTable(doc, {
      startY: y,
      head: [],
      body: [
        ['Kode Insiden',       data.kode_insiden],
        ['Jenis',              JENIS_INSIDEN_LABELS[data.jenis]],
        ['Tanggal Kejadian',   tanggal],
        ['Waktu Kejadian',     waktu],
        ['Lokasi',             data.lokasi],
        ['Dampak',             DAMPAK_INSIDEN_LABELS[data.dampak]],
        ['Tingkat Keparahan',  TINGKAT_KEPARAHAN_LABELS[data.tingkat_keparahan]],
        ['Status',             STATUS_INSIDEN_LABELS[data.status]],
        ['Dilaporkan Oleh',    data.is_anonim ? 'Anonim' : (data.pelapor?.nama_lengkap || '-')],
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 52, fontStyle: 'bold', fillColor: [245, 247, 250] },
        1: { cellWidth: 'auto' },
      },
      margin: { left: margin, right: margin },
    })

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7

    // Deskripsi
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('DESKRIPSI KEJADIAN', margin, y)
    y += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const descLines = doc.splitTextToSize(data.deskripsi, pageWidth - margin * 2)
    doc.text(descLines, margin, y)
    y += (descLines as string[]).length * 5 + 4

    // Tindakan Segera
    if (data.investigasi?.tindakan_segera) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('TINDAKAN SEGERA', margin, y)
      y += 5

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const tsLines = doc.splitTextToSize(data.investigasi.tindakan_segera, pageWidth - margin * 2)
      doc.text(tsLines, margin, y)
      y += (tsLines as string[]).length * 5 + 4
    }

    // ── Page 2: Investigation ─────────────────────────────────────────
    if (data.investigasi) {
      const inv = data.investigasi
      doc.addPage()
      y = 15

      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text('HASIL INVESTIGASI', pageWidth / 2, y, { align: 'center' })
      y += 5

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`Ref: ${data.kode_insiden}`, pageWidth / 2, y, { align: 'center' })
      y += 4

      doc.setLineWidth(0.5)
      doc.line(margin, y, pageWidth - margin, y)
      y += 7

      // Investigator info
      const metodeLabel =
        inv.metode_analisis === '5_whys'   ? '5 Whys'   :
        inv.metode_analisis === 'fishbone'  ? 'Fishbone' :
        inv.metode_analisis               ?? '-'

      autoTable(doc, {
        startY: y,
        head: [],
        body: [
          ['Investigator',       inv.investigator?.nama_lengkap || '-'],
          ['Tanggal Investigasi', inv.tanggal_investigasi
            ? new Date(inv.tanggal_investigasi).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
            : '-'],
          ['Metode Analisis',    metodeLabel],
          ['Status Investigasi', inv.status === 'final' ? 'Final' : 'Draft'],
        ],
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2.5 },
        columnStyles: {
          0: { cellWidth: 52, fontStyle: 'bold', fillColor: [245, 247, 250] },
          1: { cellWidth: 'auto' },
        },
        margin: { left: margin, right: margin },
      })
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7

      // Kronologi
      if (inv.kronologi) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('KRONOLOGI KEJADIAN', margin, y)
        y += 5

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        const kroLines = doc.splitTextToSize(inv.kronologi, pageWidth - margin * 2)
        doc.text(kroLines, margin, y)
        y += (kroLines as string[]).length * 5 + 6
      }

      // 5 Whys table
      if (inv.analisis_5why && inv.analisis_5why.length > 0) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('ANALISIS 5 WHYS', margin, y)
        y += 4

        autoTable(doc, {
          startY: y,
          head: [['#', 'Pertanyaan (Why)', 'Jawaban']],
          body: inv.analisis_5why.map((w, i) => [
            String(i + 1),
            w.why,
            w.jawaban || '-',
          ]),
          theme: 'striped',
          headStyles: { fillColor: [79, 70, 229], fontSize: 9 },
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 68 },
            2: { cellWidth: 'auto' },
          },
          styles: { cellPadding: 2, overflow: 'linebreak' },
          margin: { left: margin, right: margin },
        })
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7
      }

      // Faktor Penyebab
      const factors = ([
        inv.faktor_manusia    ? ['Faktor Manusia',    inv.faktor_manusia]    : null,
        inv.faktor_lingkungan ? ['Faktor Lingkungan', inv.faktor_lingkungan] : null,
        inv.faktor_sistem     ? ['Faktor Sistem',     inv.faktor_sistem]     : null,
      ] as ([string, string] | null)[]).filter((f): f is [string, string] => f !== null)

      if (factors.length > 0) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('FAKTOR PENYEBAB', margin, y)
        y += 4

        autoTable(doc, {
          startY: y,
          head: [],
          body: factors,
          theme: 'grid',
          styles: { fontSize: 9, cellPadding: 2.5 },
          columnStyles: {
            0: { cellWidth: 52, fontStyle: 'bold', fillColor: [245, 247, 250] },
            1: { cellWidth: 'auto' },
          },
          margin: { left: margin, right: margin },
        })
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7
      }

      // Akar Penyebab
      if (inv.akar_penyebab) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('AKAR PENYEBAB', margin, y)
        y += 5

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        const akpLines = doc.splitTextToSize(inv.akar_penyebab, pageWidth - margin * 2)
        doc.text(akpLines, margin, y)
        y += (akpLines as string[]).length * 5 + 6
      }

      // Tindakan table
      if (data.tindakan.length > 0) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('RENCANA TINDAKAN', margin, y)
        y += 4

        autoTable(doc, {
          startY: y,
          head: [['Jenis', 'Deskripsi Tindakan', 'PIC', 'Target', 'Status']],
          body: data.tindakan.map(t => [
            t.jenis === 'korektif' ? 'Korektif' : 'Preventif',
            t.deskripsi,
            t.penanggung_jawab?.nama_lengkap || '-',
            t.target_selesai
              ? new Date(t.target_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
              : '-',
            STATUS_TINDAKAN_LABELS[t.status],
          ]),
          theme: 'striped',
          headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 30 },
            3: { cellWidth: 22 },
            4: { cellWidth: 24 },
          },
          styles: { cellPadding: 2, overflow: 'linebreak' },
          margin: { left: margin, right: margin },
        })
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7
      }

      // Kesimpulan
      if (inv.kesimpulan) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('KESIMPULAN', margin, y)
        y += 5

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        const kesLines = doc.splitTextToSize(inv.kesimpulan, pageWidth - margin * 2)
        doc.text(kesLines, margin, y)
        y += (kesLines as string[]).length * 5 + 8
      }

      // Signature section
      const pageHeight = doc.internal.pageSize.getHeight()
      const sigBaseY = Math.min(y + 6, pageHeight - 52)

      const tanggalCetak = new Date().toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric',
      })

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`Gresik, ${tanggalCetak}`, pageWidth - margin, sigBaseY, { align: 'right' })

      const labelY = sigBaseY + 8
      doc.text('Mengetahui,', margin, labelY)
      doc.text('Dibuat Oleh,', pageWidth / 2 + 20, labelY)

      const nameY = labelY + 32

      // Measure name widths to draw matching lines
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      const leftName = ketuaRW
      const rightName = inv.investigator?.nama_lengkap || 'Investigator'
      const leftNameWidth = doc.getTextWidth(leftName)
      const rightNameWidth = doc.getTextWidth(rightName)

      // Draw lines matching name width + small padding
      doc.setLineWidth(0.3)
      doc.line(margin - 2, nameY - 2, margin + leftNameWidth + 2, nameY - 2)
      doc.line(pageWidth / 2 + 18, nameY - 2, pageWidth / 2 + 22 + rightNameWidth, nameY - 2)

      // Names
      doc.text(leftName, margin, nameY)
      doc.text(rightName, pageWidth / 2 + 20, nameY)

      // Role labels
      doc.setFont('helvetica', 'normal')
      doc.text('Ketua RW 013', margin, nameY + 5)
      doc.text('Investigator', pageWidth / 2 + 20, nameY + 5)
    }

    // ── Footer on every page ──────────────────────────────────────────
    const totalPages = (doc as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      const ph = doc.internal.pageSize.getHeight()
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(150)
      doc.text(
        `${data.kode_insiden} — Digenerate otomatis oleh Sistem SIRW13 · app.permatadiscovery.com`,
        margin, ph - 8,
      )
      doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - margin, ph - 8, { align: 'right' })
      doc.setTextColor(0)
    }

    const fileName = `${data.kode_insiden.replace(/\//g, '-')}_laporan.pdf`
    doc.save(fileName)
  }, [data, ketuaRW])

  return (
    <button
      className="btn btn-danger d-flex align-items-center gap-2"
      onClick={generate}
      disabled={disabled}
    >
      <FiDownload size={16} />
      Unduh Laporan PDF
    </button>
  )
}
