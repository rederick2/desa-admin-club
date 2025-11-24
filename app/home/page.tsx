'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Bell, User as UserIcon } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TicketCard } from '@/components/ticket-card'
import { TicketDetailDialog } from '@/components/ticket-detail-dialog'
import type { User } from '@supabase/supabase-js'

interface Ticket {
  id: string;
  codigo: string;
  qr_data: string;
  usado?: boolean;
  event_zones: {
    club_zones: {
      nombre: string;
    } | null;
    events: {
      nombre: string;
      fecha_inicio: string;
      clubs: {
        nombre: string;
      } | null;
    } | null;
  } | null;
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
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

      const { data: ticketData, error } = await supabase
        .from('tickets')
        .select(`
          id,
          codigo,
          qr_data,
          usado,
          event_zones (
            club_zones ( nombre ),
            events (
              nombre,
              fecha_inicio,
              clubs ( nombre )
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching tickets:', error)
      } else {
        setTickets(ticketData as unknown as Ticket[])
      }
      setLoading(false)
    }

    fetchUserAndTickets()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const entradasActivas = tickets.filter(ticket => {
    if (!ticket.event_zones?.events?.fecha_inicio) return true;
    const fechaEvento = new Date(ticket.event_zones.events.fecha_inicio);
    return fechaEvento >= hoy;
  });

  const entradasPasadas = tickets.filter(ticket => {
    if (!ticket.event_zones?.events?.fecha_inicio) return false;
    const fechaEvento = new Date(ticket.event_zones.events.fecha_inicio);
    return fechaEvento < hoy;
  });

  const groupTicketsByMonth = (ticketList: Ticket[]) => {
    const grouped: Record<string, Ticket[]> = {};
    ticketList.forEach(ticket => {
      const dateStr = ticket.event_zones?.events?.fecha_inicio;
      if (!dateStr) return;
      const date = new Date(dateStr);
      const key = format(date, 'MMMM yyyy', { locale: es });
      const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);

      if (!grouped[capitalizedKey]) {
        grouped[capitalizedKey] = [];
      }
      grouped[capitalizedKey].push(ticket);
    });
    return grouped;
  };

  const activeGrouped = groupTicketsByMonth(entradasActivas);
  const pastGrouped = groupTicketsByMonth(entradasPasadas);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 pb-20">
      <header className="flex justify-between items-center mb-6 pt-2">
        <h1 className="text-2xl font-bold">Mis Entradas</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 bg-card border-0">
            <Bell className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl h-10 w-10 bg-card border-0"
              >
                <UserIcon className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
                Mi Perfil
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-500 focus:text-red-500"
                onClick={async () => {
                  await supabase.auth.signOut()
                  router.push('/login')
                }}
              >
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Tabs defaultValue="proximos" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 bg-card/50 p-1 rounded-xl h-12">
          <TabsTrigger
            value="proximos"
            className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground font-medium"
          >
            Próximos
          </TabsTrigger>
          <TabsTrigger
            value="anteriores"
            className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground font-medium"
          >
            Anteriores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proximos" className="space-y-6">
          {Object.keys(activeGrouped).length > 0 ? (
            Object.entries(activeGrouped).map(([month, monthTickets]) => (
              <div key={month}>
                <h2 className="text-lg font-semibold mb-3 text-muted-foreground">{month}</h2>
                <div className="space-y-3">
                  {monthTickets.map((ticket) => (
                    <TicketCard
                      key={ticket.id}
                      eventName={ticket.event_zones?.events?.nombre || 'Evento'}
                      eventLocation={ticket.event_zones?.events?.clubs?.nombre || 'Ubicación'}
                      eventDate={ticket.event_zones?.events?.fecha_inicio || new Date()}
                      ticketCount={1}
                      eventImage="/placeholder.svg?height=100&width=100"
                      onClick={() => {
                        setSelectedTicket(ticket)
                        setDialogOpen(true)
                      }}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No tienes entradas próximas.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="anteriores" className="space-y-6">
          {Object.keys(pastGrouped).length > 0 ? (
            Object.entries(pastGrouped).map(([month, monthTickets]) => (
              <div key={month}>
                <h2 className="text-lg font-semibold mb-3 text-muted-foreground">{month}</h2>
                <div className="space-y-3">
                  {monthTickets.map((ticket) => (
                    <TicketCard
                      key={ticket.id}
                      eventName={ticket.event_zones?.events?.nombre || 'Evento'}
                      eventLocation={ticket.event_zones?.events?.clubs?.nombre || 'Ubicación'}
                      eventDate={ticket.event_zones?.events?.fecha_inicio || new Date()}
                      ticketCount={1}
                      eventImage="/placeholder.svg?height=100&width=100"
                      onClick={() => {
                        setSelectedTicket(ticket)
                        setDialogOpen(true)
                      }}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No tienes entradas pasadas.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <TicketDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        ticket={selectedTicket}
      />
    </div>
  )
}
