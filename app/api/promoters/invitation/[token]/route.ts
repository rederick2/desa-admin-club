import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {

  const { token } = await params

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
    const { data: invitation, error } = await supabase
      .from('promoter_invitations')
      .select(`
        *,
        clubs:club_id (
          nombre
        )
      `)
      .eq('token', token)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      invitation: {
        ...invitation,
        club_name: invitation.clubs?.nombre,
      },
    })
  } catch (error) {
    console.error('[v0] Error loading invitation:', error)
    return NextResponse.json(
      { error: 'Error loading invitation' },
      { status: 400 }
    )
  }
}
