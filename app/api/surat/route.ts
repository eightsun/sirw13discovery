import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PENGURUS_RW_ROLES = ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw']

// POST: Create surat (bypass RLS via admin client)
export async function POST(request: NextRequest) {
  try {
    // Verify auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify role
    const adminClient = createAdminClient()
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 403 })
    }

    if (!PENGURUS_RW_ROLES.includes(userData.role)) {
      return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 403 })
    }

    const body = await request.json()

    // Insert via admin client (bypass RLS)
    const { data, error } = await adminClient
      .from('surat')
      .insert({
        tipe: body.tipe,
        nomor_surat: body.nomor_surat,
        perihal: body.perihal,
        isi_surat: body.isi_surat || null,
        tanggal_rilis: body.tanggal_rilis,
        lampiran_url: body.lampiran_url || null,
        lampiran_filename: body.lampiran_filename || null,
        kategori_surat: body.kategori_surat || null,
        pengirim: body.pengirim || null,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Insert surat error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data.id })

  } catch (error: unknown) {
    console.error('API surat error:', error)
    const message = error instanceof Error ? error.message : 'Gagal menyimpan surat'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PUT: Update surat (bypass RLS via admin client)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { data: userData } = await adminClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || !PENGURUS_RW_ROLES.includes(userData.role)) {
      return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 403 })
    }

    const body = await request.json()

    const { error } = await adminClient
      .from('surat')
      .update({
        tipe: body.tipe,
        nomor_surat: body.nomor_surat,
        perihal: body.perihal,
        isi_surat: body.isi_surat || null,
        tanggal_rilis: body.tanggal_rilis,
        lampiran_url: body.lampiran_url,
        lampiran_filename: body.lampiran_filename,
        kategori_surat: body.kategori_surat || null,
        pengirim: body.pengirim || null,
      })
      .eq('id', body.id)

    if (error) {
      console.error('Update surat error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: unknown) {
    console.error('API surat error:', error)
    const message = error instanceof Error ? error.message : 'Gagal mengupdate surat'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE: Delete surat (bypass RLS via admin client)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { data: userData } = await adminClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || !PENGURUS_RW_ROLES.includes(userData.role)) {
      return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID surat diperlukan' }, { status: 400 })
    }

    // Get surat to find lampiran for deletion
    const { data: surat } = await adminClient
      .from('surat')
      .select('lampiran_url')
      .eq('id', id)
      .single()

    // Delete file from storage if exists
    if (surat?.lampiran_url) {
      const match = surat.lampiran_url.match(/\/surat\/(.+)$/)
      if (match) {
        await adminClient.storage.from('surat').remove([match[1]])
      }
    }

    // Delete record
    const { error } = await adminClient.from('surat').delete().eq('id', id)

    if (error) {
      console.error('Delete surat error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: unknown) {
    console.error('API surat error:', error)
    const message = error instanceof Error ? error.message : 'Gagal menghapus surat'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
