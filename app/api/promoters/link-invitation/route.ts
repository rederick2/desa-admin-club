import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { token, userId } = body

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {},
      },
    }
  )

  try {
    // Get invitation
    const { data: invitation, error: invError } = await supabase
      .from('promoter_invitations')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (invError || !invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 400 }
      )
    }

    // Create promoter record
    const { error: promoterError } = await supabase
      .from('promoters')
      .insert([
        {
          user_id: userId,
          club_id: invitation.club_id,
          porcentaje_comision: invitation.porcentaje_comision,
          activo: true,
          codigo: `PROM-${Date.now()}`,
        },
      ])

    if (promoterError) throw promoterError

    // Mark invitation as used
    const { error: updateError } = await supabase
      .from('promoter_invitations')
      .update({
        used: true,
        used_by: userId,
        used_at: new Date().toISOString(),
      })
      .eq('token', token)

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      message: 'Promoter linked successfully',
    })
  } catch (error) {
    console.error('[v0] Error linking invitation:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error linking invitation' },
      { status: 400 }
    )
  }
}
