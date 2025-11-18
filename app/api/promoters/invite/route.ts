import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { clubId, email, porcentaje_comision } = body

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
    console.log('[v0] Invitation request:', { clubId, email, porcentaje_comision })

    if (!email || !clubId) {
      return NextResponse.json(
        { error: 'Email y Club ID son requeridos' },
        { status: 400 }
      )
    }

    // Generate unique token for invitation
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    console.log('[v0] Inserting invitation:', {
      token,
      club_id: clubId,
      email,
      porcentaje_comision,
      expires_at: expiresAt.toISOString(),
    })

    // Store invitation
    const { data, error: invitationError } = await supabase
      .from('promoter_invitations')
      .insert([
        {
          token,
          club_id: clubId,
          email,
          porcentaje_comision: porcentaje_comision || 0,
          expires_at: expiresAt.toISOString(),
        },
      ])
      .select()

    if (invitationError) {
      console.log('[v0] Invitation insert error:', invitationError)
      return NextResponse.json(
        { error: invitationError.message || 'Error al crear invitación' },
        { status: 400 }
      )
    }

    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`
    const invitationUrl = `${baseUrl}/promoter/invite/${token}`

    console.log('[v0] Invitation created successfully:', { invitationUrl })

    return NextResponse.json({
      success: true,
      token,
      invitationUrl,
      message: 'Link de invitación generado',
    })
  } catch (error) {
    console.error('[v0] Error generating invitation:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[v0] Full error:', errorMessage)
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.stack : 'No stack trace'
      },
      { status: 500 }
    )
  }
}
