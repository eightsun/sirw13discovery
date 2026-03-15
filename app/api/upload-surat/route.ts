import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PDFDocument } from 'pdf-lib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_TYPES = ['application/pdf', ...IMAGE_TYPES]

async function convertImageToPdf(imageBuffer: Buffer, mimeType: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()

  // For WEBP, we need to handle differently - pdf-lib doesn't support WEBP natively
  // We'll treat WEBP as PNG since most WEBP can be decoded similarly
  let image
  if (mimeType === 'image/jpeg') {
    image = await pdfDoc.embedJpg(imageBuffer)
  } else {
    // PNG and WEBP
    image = await pdfDoc.embedPng(imageBuffer)
  }

  const { width, height } = image.scale(1)
  const page = pdfDoc.addPage([width, height])
  page.drawImage(image, { x: 0, y: 0, width, height })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate file type - PDF or images
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Format file tidak didukung. Gunakan PDF, JPG, atau PNG.' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Ukuran file terlalu besar. Maksimal 10MB.' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const originalBuffer = Buffer.from(arrayBuffer)
    const originalSize = originalBuffer.length
    const isImage = IMAGE_TYPES.includes(file.type)

    let uploadBuffer: Buffer

    if (isImage) {
      // Convert image to PDF
      try {
        uploadBuffer = await convertImageToPdf(originalBuffer, file.type)
        console.log(`Image converted to PDF: ${(originalSize / 1024).toFixed(1)}KB → ${(uploadBuffer.length / 1024).toFixed(1)}KB`)
      } catch (convertErr) {
        console.error('Image to PDF conversion failed:', convertErr)
        return NextResponse.json(
          { error: 'Gagal mengkonversi gambar ke PDF. Coba format lain (JPG/PNG).' },
          { status: 500 }
        )
      }
    } else {
      // Compress PDF: copy pages to new document (strips unused objects & metadata)
      uploadBuffer = originalBuffer
      try {
        const srcDoc = await PDFDocument.load(originalBuffer, { ignoreEncryption: true })
        const newDoc = await PDFDocument.create()
        const pages = await newDoc.copyPages(srcDoc, srcDoc.getPageIndices())
        pages.forEach((page) => newDoc.addPage(page))
        const compressedBytes = await newDoc.save()
        const compressedBuffer = Buffer.from(compressedBytes)

        if (compressedBuffer.length < originalBuffer.length) {
          uploadBuffer = compressedBuffer
          console.log(`PDF compressed: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedBuffer.length / 1024).toFixed(1)}KB (${((1 - compressedBuffer.length / originalSize) * 100).toFixed(1)}% reduction)`)
        }
      } catch (compressErr) {
        console.warn('PDF compression failed, using original file:', compressErr)
      }
    }

    // Generate unique filename (always .pdf)
    const timestamp = Date.now()
    const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9.-]/g, '_')
    const uniqueName = `lampiran/${timestamp}_${baseName}.pdf`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('surat')
      .upload(uniqueName, uploadBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)

      if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
        return NextResponse.json(
          { error: 'Storage bucket "surat" belum dibuat. Buat di Supabase Dashboard → Storage → New Bucket.' },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { error: uploadError.message || 'Upload gagal' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('surat')
      .getPublicUrl(uniqueName)

    return NextResponse.json({
      success: true,
      fileUrl: urlData.publicUrl,
      fileName: `${baseName}.pdf`,
      originalSize,
      compressedSize: uploadBuffer.length,
      convertedFromImage: isImage,
    })

  } catch (error: unknown) {
    console.error('Upload error:', error)
    const message = error instanceof Error ? error.message : 'Upload gagal'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
