'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { AdminNav } from '@/components/admin-nav'
import { EventStatistics } from '@/components/event-statistics'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function EventStatsPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params?.id as string
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<any>(null)

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
      await loadEvent()
      setLoading(false)
    }

    checkAuth()
  }, [router, eventId])

  const loadEvent = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()

      if (error) throw error
      setEvent(data)
    } catch (error) {
      console.error('Error loading event:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav clubName="Estadísticas del Evento" userEmail={user?.email} />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Button>

        {event && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">{event.nombre}</h2>
              <p className="text-muted-foreground">
                Análisis de asistencia y desempeño
              </p>
            </div>
            <EventStatistics eventId={eventId} />
          </div>
        )}
      </main>
    </div>
  )
}
