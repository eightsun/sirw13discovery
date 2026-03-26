import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) return NextResponse.json({ error: 'Tidak ada file yang diupload' }, { status: 400 })

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Format file harus JPG, PNG, atau WEBP.' }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Ukuran file maksimal 10MB.' }, { status: 400 })
    }

    const timestamp  = Date.now()
    const sanitized  = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const uniqueName = `bukti/${user.id}/${timestamp}_${sanitized}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('insiden')
      .upload(uniqueName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      if (uploadError.message?.includes('Bucket not found')) {
        return NextResponse.json({
          error: 'Storage bucket "insiden" belum dibuat. Buat bucket di Supabase dashboard terlebih dahulu.',
        }, { status: 500 })
      }
      return NextResponse.json({ error: uploadError.message || 'Upload gagal' }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from('insiden').getPublicUrl(uniqueName)

    return NextResponse.json({ success: true, fileUrl: urlData.publicUrl, fileName: sanitized })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload gagal'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
