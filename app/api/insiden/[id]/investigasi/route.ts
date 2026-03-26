import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, isAuthError, ALL_PENGURUS_ROLES, PENGURUS_RW_ROLES } from '@/lib/auth/apiAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/insiden/[id]/investigasi
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (isAuthError(auth)) return auth

  const adminClient = createAdminClient()
  const isOfficer = ALL_PENGURUS_ROLES.includes(auth.role)

  const { data, error } = await adminClient
    .from('insiden_investigasi')
    .select('*')
    .eq('insiden_id', params.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json(null)

  // Warga can only see finalised investigations
  if (!isOfficer && data.status !== 'final') {
    return NextResponse.json(null)
  }

  return NextResponse.json(data)
}

// POST /api/insiden/[id]/investigasi — create investigation (officers only)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (isAuthError(auth)) return auth

  if (!ALL_PENGURUS_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 403 })
  }

  const adminClient = createAdminClient()

  // Check incident exists
  const { data: insiden, error: fetchErr } = await adminClient
    .from('insiden')
    .select('id, status')
    .eq('id', params.id)
    .single()
  if (fetchErr || !insiden) return NextResponse.json({ error: 'Insiden tidak ditemukan' }, { status: 404 })

  // Check not already created
  const { data: existing } = await adminClient
    .from('insiden_investigasi')
    .select('id')
    .eq('insiden_id', params.id)
    .maybeSingle()
  if (existing) return NextResponse.json({ error: 'Investigasi sudah ada, gunakan PATCH untuk memperbarui' }, { status: 409 })

  try {
    const body = await request.json()
    const { data, error } = await adminClient
      .from('insiden_investigasi')
      .insert({
        insiden_id:           params.id,
        investigator_id:      auth.user.id,
        tanggal_investigasi:  body.tanggal_investigasi || null,
        kronologi:            body.kronologi           || null,
        metode_analisis:      body.metode_analisis     || null,
        analisis_5why:        body.analisis_5why        || null,
        faktor_manusia:       body.faktor_manusia       || null,
        faktor_lingkungan:    body.faktor_lingkungan    || null,
        faktor_sistem:        body.faktor_sistem        || null,
        tindakan_segera:      body.tindakan_segera      || null,
        akar_penyebab:        body.akar_penyebab        || null,
        kesimpulan:           body.kesimpulan           || null,
        status:               body.status === 'final' ? 'final' : 'draft',
      })
      .select()
      .single()

    if (error) throw error

    // If saving as final, update incident status to menunggu_tindakan
    if (body.status === 'final' && insiden.status === 'dalam_investigasi') {
      await adminClient
        .from('insiden')
        .update({ status: 'menunggu_tindakan', updated_at: new Date().toISOString() })
        .eq('id', params.id)

      await adminClient.from('insiden_timeline').insert({
        insiden_id:  params.id,
        status_lama: 'dalam_investigasi',
        status_baru: 'menunggu_tindakan',
        catatan:     'Investigasi diselesaikan, menunggu tindak lanjut',
        dibuat_oleh: auth.user.id,
      })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal menyimpan investigasi'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH /api/insiden/[id]/investigasi — update investigation
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (isAuthError(auth)) return auth

  if (!ALL_PENGURUS_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 403 })
  }

  const adminClient = createAdminClient()

  // Fetch existing
  const { data: existing, error: fetchErr } = await adminClient
    .from('insiden_investigasi')
    .select('id, status, insiden_id')
    .eq('insiden_id', params.id)
    .single()

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Investigasi tidak ditemukan' }, { status: 404 })
  }

  // Cannot edit a final investigation unless RW officer
  if (existing.status === 'final' && !PENGURUS_RW_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: 'Investigasi sudah final dan tidak dapat diubah' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const wasDraft = existing.status === 'draft'
    const nowFinal = body.status === 'final'

    const { data, error } = await adminClient
      .from('insiden_investigasi')
      .update({
        tanggal_investigasi: body.tanggal_investigasi ?? undefined,
        kronologi:           body.kronologi           ?? undefined,
        metode_analisis:     body.metode_analisis     ?? undefined,
        analisis_5why:       body.analisis_5why        ?? undefined,
        faktor_manusia:      body.faktor_manusia       ?? undefined,
        faktor_lingkungan:   body.faktor_lingkungan    ?? undefined,
        faktor_sistem:       body.faktor_sistem        ?? undefined,
        tindakan_segera:     body.tindakan_segera      ?? undefined,
        akar_penyebab:       body.akar_penyebab        ?? undefined,
        kesimpulan:          body.kesimpulan           ?? undefined,
        status:              body.status               ?? undefined,
        updated_at:          new Date().toISOString(),
      })
      .eq('insiden_id', params.id)
      .select()
      .single()

    if (error) throw error

    // Finalising for the first time → auto-advance incident status
    if (wasDraft && nowFinal) {
      const { data: insiden } = await adminClient
        .from('insiden')
        .select('status')
        .eq('id', params.id)
        .single()

      if (insiden?.status === 'dalam_investigasi') {
        await adminClient
          .from('insiden')
          .update({ status: 'menunggu_tindakan', updated_at: new Date().toISOString() })
          .eq('id', params.id)

        await adminClient.from('insiden_timeline').insert({
          insiden_id:  params.id,
          status_lama: 'dalam_investigasi',
          status_baru: 'menunggu_tindakan',
          catatan:     'Investigasi diselesaikan, menunggu tindak lanjut',
          dibuat_oleh: auth.user.id,
        })
      }
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal memperbarui investigasi'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
