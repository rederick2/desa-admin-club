'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { User } from '@supabase/supabase-js'

interface Ticket {
  id: string;
  codigo: string;
  qr_data: string;
  event_zones: {
    club_zones: {
      nombre: string;
    } | null;
    events: {
      nombre: string;
      clubs: {
        nombre: string;
      } | null;
    } | null;
  } | null;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const fetchUserAndTickets = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      // Fetch tickets for the logged-in user
      const { data: ticketData, error } = await supabase
        .from('tickets')
        .select(`
          id,
          codigo,
          qr_data,
          event_zones (
            club_zones ( nombre ),
            events (
              nombre,
              clubs ( nombre )
            )
          )
        `)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error fetching tickets:', error)
      } else {
        setTickets(ticketData as Ticket[])
      }
      setLoading(false)
    }

    fetchUserAndTickets()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Cargando tus entradas...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Mis Entradas</h1>
        {tickets.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tickets.map((ticket) => (
              <Card key={ticket.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{ticket.event_zones?.events?.nombre || 'Evento Desconocido'}</CardTitle>
                  <CardDescription>{ticket.event_zones?.events?.clubs?.nombre || 'Club Desconocido'}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col items-center justify-center space-y-4">
                  <div className="p-4 bg-white rounded-lg">
                    <QRCodeSVG value={ticket.codigo || 'no-code'} size={180} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Zona: {ticket.event_zones?.club_zones?.nombre || 'N/A'}</p>
                    <p className="font-mono text-lg tracking-widest">{ticket.codigo}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground mb-4">No tienes ninguna entrada por el momento.</p>
            <Button onClick={() => router.push('/dashboard/events')}>Explorar eventos</Button>
          </div>
        )}
      </div>
    </div>
  )
}
