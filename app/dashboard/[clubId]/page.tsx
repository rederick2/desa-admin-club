'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { DashboardNavigation } from '@/components/dashboard-navigation'
import { DashboardCards } from '@/components/dashboard-cards'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Club {
  id: string
  nombre: string
  descripcion: string
  logo: string | null
}

export default function ClubDashboardPage() {
  const router = useRouter()
  const params = useParams()
  const clubId = params.clubId as string

  const [user, setUser] = useState<User | null>(null)
  const [club, setClub] = useState<Club | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    activeEvents: 0,
    estimatedCapacity: 0,
    codesGenerated: 0,
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push('/login')
        return
      }

      setUser(session.user)

      const { data: clubData } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', clubId)
        .eq('user_id', session.user.id)
        .single()

      if (!clubData) {
        router.push('/dashboard')
        return
      }

      setClub(clubData)

      const { count: eventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', clubId)

      setStats({
        activeEvents: eventsCount || 0,
        estimatedCapacity: 0,
        codesGenerated: 0,
      })

      setLoading(false)
    }

    checkAuth()
  }, [router, clubId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  if (!club) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome Section */}
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Bienvenido</h2>
          <p className="text-muted-foreground">
            Gestiona tus eventos, entradas y promotores
          </p>
        </div>

        {/* Quick Actions */}
        <DashboardNavigation clubId={clubId} />

        {/* Stats Cards */}
        <DashboardCards
          activeEvents={stats.activeEvents}
          estimatedCapacity={stats.estimatedCapacity}
          codesGenerated={stats.codesGenerated}
        />

        {/* Chart Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Asistencia por evento (últimos 7 días)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">
                El gráfico se mostrará cuando tengas datos de eventos
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
