'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        setUser(session.user)

        // obtener role
        const { data: roleData, error: zoneError } = await supabase
          .from('user_roles')
          .select('role_id')
          .eq('user_id', session.user.id)
          .single()

        if (!zoneError && roleData) {
          setRole(roleData)
        }
        if (roleData?.role_id === 1) {
          router.push('/dashboard')
        } else if (roleData?.role_id === 2) {
          router.push('/promoter')
        } else if (roleData?.role_id === 3) {
          router.push('/home')
        }


      } else {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center "
        style={{
          background: 'linear-gradient(135deg, #1a0b2e 0%, #2d1b4e 50%, #4a2c6d 100%)',
          minHeight: '100vh'
        }}>
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{
        background: 'linear-gradient(135deg, #1a0b2e 0%, #2d1b4e 50%, #4a2c6d 100%)',
        minHeight: '100vh'
      }}>
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold text-foreground mb-4">
          Club Manager
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Gestiona tus eventos, entradas y promotores en un solo lugar
        </p>

        <div className="flex gap-4 justify-center">
          <Button onClick={() => router.push('/login')} size="lg">
            Iniciar sesión
          </Button>
          <Button
            onClick={() => router.push('/signup')}
            variant="outline"
            size="lg"
          >
            Crear cuenta
          </Button>
        </div>
      </div>
    </div>
  )
}
