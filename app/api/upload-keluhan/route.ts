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
    const type = formData.get('type') as string || 'bukti' // 'bukti' or 'penyelesaian'
    
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Format file harus JPG, PNG, atau WEBP.' }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Ukuran file maksimal 10MB.' }, { status: 400 })
    }

    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const folder = type === 'penyelesaian' ? 'penyelesaian' : 'bukti'
    const uniqueName = `${folder}/${timestamp}_${sanitizedName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data, error: uploadError } = await supabase.storage
      .from('keluhan')
      .upload(uniqueName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      if (uploadError.message?.includes('Bucket not found')) {
        return NextResponse.json({ error: 'Storage bucket "keluhan" belum dibuat.' }, { status: 500 })
      }
      return NextResponse.json({ error: uploadError.message || 'Upload gagal' }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from('keluhan').getPublicUrl(uniqueName)

    return NextResponse.json({ success: true, fileUrl: urlData.publicUrl, fileName: sanitizedName })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload gagal'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}