'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Image from 'next/image'
import Link from 'next/link'
import { AdminNav } from '@/components/admin-nav'
import type { User } from '@supabase/supabase-js'

interface Event {
  id: string;
  nombre: string;
  fecha: string;
  imagen_url: string | null;
  clubs: {
    nombre: string;
  } | null;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [user] = useState<User | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          nombre,
          fecha_inicio,
          banner_url,
          clubs ( nombre )
        `)
        .eq('activo', true) // Solo eventos activos/publicados
        .gte('fecha_inicio', new Date().toISOString()) // Solo eventos futuros
        .order('fecha_inicio ', { ascending: true })

      if (error) {
        console.error('Error fetching events:', error)
      } else {
        setEvents(data as Event[])
      }
      setLoading(false)
    }

    fetchEvents()
  }, [supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center ">
        <p className="text-muted-foreground">Cargando eventos...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen ">
      <AdminNav clubName="Ver Evento" userEmail={user?.email} />
      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        <h1 className="text-3xl font-bold mb-8">Explorar Eventos</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <Link href={`./events/${event.id}`}>
                <div className="relative h-48 w-full">
                  <Image
                    src={event.imagen_url || 'https://placehold.co/600x400/000000/FFFFFF/png?text=Evento'}
                    alt={event.nombre}
                    layout="fill"
                    objectFit="cover"
                  />
                </div>
                <CardHeader>
                  <CardTitle className="truncate">{event.nombre}</CardTitle>
                  <CardDescription>{event.clubs?.nombre || 'Club Desconocido'}</CardDescription>
                  <CardDescription>{new Date(event.fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
                </CardHeader>
              </Link>
            </Card>
          ))}
        </div>
        {events.length === 0 && !loading && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No hay eventos disponibles en este momento.</p>
          </div>
        )}
      </div>
    </div>
  )
}