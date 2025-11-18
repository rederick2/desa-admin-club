import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { clubId, nombre, email, telefono, porcentaje_comision } = body

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
    // Generate a random password
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    // Create auth user
    const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (signUpError) throw new Error(`Auth error: ${signUpError.message}`)

    const { error: userError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user?.id,
          nombre,
          email,
          telefono: telefono || null,
        },
      ])

    if (userError) throw new Error(`User error: ${userError.message}`)

    // Insert promoter record
    const { error: promoterError } = await supabase
      .from('promoters')
      .insert([
        {
          user_id: authData.user?.id,
          nombre,
          email,
          telefono: telefono || null,
          club_id: clubId,
          activo: true,
          porcentaje_comision: porcentaje_comision || 0,
          codigo: `PROM-${Date.now()}`,
        },
      ])

    if (promoterError) throw new Error(`Promoter error: ${promoterError.message}`)

    return NextResponse.json({
      success: true,
      password,
      userId: authData.user?.id,
    })
  } catch (error) {
    console.error('[v0] Promoter creation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error creating promoter' },
      { status: 400 }
    )
  }
}
