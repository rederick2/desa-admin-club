'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { PlusCircle, QrCode } from 'lucide-react'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

interface Club {
  id: string
  nombre: string
  descripcion: string
  logo: string | null
  user_id: string
  created_at: string
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null)
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const fetchAdminData = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', user.id)
        .single()

      if (profileError || !profile || profile.role_id !== 1) {
        router.push('/dashboard') // Redirigir si no es admin
        return
      }

      setUser(user)

      // Obtener los clubes del admin
      const { data: clubsData, error: clubsError } = await supabase
        .from('clubs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (clubsError) {
        console.error('Error fetching clubs:', clubsError.message)
      } else {
        setClubs(clubsData as Club[])
      }

      setLoading(false)
    }

    fetchAdminData()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #1a0b2e 0%, #2d1b4e 50%, #4a2c6d 100%)',
        minHeight: '100vh'
      }}>
        <p className="text-muted-foreground">Cargando panel de administrador...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-8" style={{
      background: 'linear-gradient(135deg, #1a0b2e 0%, #2d1b4e 50%, #4a2c6d 100%)',
      minHeight: '100vh'
    }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Panel de Administrador</h1>
          <Button asChild>
            <Link href="/dashboard/create-club">
              <PlusCircle className="mr-2 h-4 w-4" /> Crear Nuevo Club
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clubs.map((club) => (
            <Link key={club.id} href={`/dashboard/${club.id}`}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>{club.nombre}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-2">
                        {club.descripcion || 'Sin descripción'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Creado el{' '}
                    {new Date(club.created_at).toLocaleDateString('es-ES')}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {clubs.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground mb-4">Aún no has creado ningún club.</p>
            <Button onClick={() => router.push('/dashboard/create-club')}>Crea tu primer club</Button>
          </div>
        )}
      </div>

      {/* Floating Scan Button */}
      <Link href="/dashboard/scan">
        <Button
          size="lg"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
        >
          <QrCode className="h-6 w-6" />
        </Button>
      </Link>
    </div>
  )
}