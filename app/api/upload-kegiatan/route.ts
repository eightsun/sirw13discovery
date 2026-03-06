import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'banner' or 'notulen'
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = type === 'notulen' 
      ? ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
      : ['image/jpeg', 'image/png', 'image/webp']
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: type === 'notulen' 
          ? 'Format file tidak didukung. Gunakan JPG, PNG, WEBP, atau PDF.'
          : 'Format file tidak didukung. Gunakan JPG, PNG, atau WEBP.' 
        },
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

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const folder = type === 'notulen' ? 'notulen' : 'banner'
    const uniqueName = `${folder}/${timestamp}_${sanitizedName}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('kegiatan')
      .upload(uniqueName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      
      if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
        return NextResponse.json(
          { error: 'Storage bucket "kegiatan" belum dibuat. Buat di Supabase Dashboard → Storage → New Bucket.' },
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
      .from('kegiatan')
      .getPublicUrl(uniqueName)

    return NextResponse.json({
      success: true,
      fileUrl: urlData.publicUrl,
      fileName: sanitizedName,
    })

  } catch (error: unknown) {
    console.error('Upload error:', error)
    const message = error instanceof Error ? error.message : 'Upload gagal'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}