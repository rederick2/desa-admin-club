'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createBrowserClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { TicketCard } from '@/components/ticket-card'
import { PromoterLinkDetailDialog } from '@/components/promoter-link-detail-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// ---------------------------
// Interfaces
// ---------------------------

interface Ticket {
  id: string
  codigo: string
  created_at: string
  users: {
    nombre: string | null
    email: string | null
  } | null
}

interface PromoterLink {
  id: string
  slug: string
  limite_generacion: number | null
  usados: number | null
  link_url: string | null
  event_zones: {
    id: string
    club_zones: {
      nombre: string
    } | null
    events: {
      nombre: string
      fecha_inicio: string
      clubs: {
        nombre: string
      } | null
    } | null
  } | null
  boxes: {
    numero: number
  } | null
  tickets?: Ticket[]
}

// ---------------------------
// Component
// ---------------------------
export default function PromoterPage() {
  const [user, setUser] = useState<User | null>(null)
  const [promoterLinks, setPromoterLinks] = useState<PromoterLink[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLinks, setSelectedLinks] = useState<PromoterLink[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)

  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // ---------------------------
  // INITIAL LOAD
  // ---------------------------
  useEffect(() => {
    const fetchPromoterData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Verificar rol = promotor (role_id = 2)
      const { data: profile, error: profileError } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', user.id)
        .single()

      if (profileError || !profile || profile.role_id !== 2) {
        router.push('/dashboard')
        return
      }

      setUser(user)

      // Obtener promoter_id del usuario
      const { data: promotersData } = await supabase
        .from('promoters')
        .select('id')
        .eq('user_id', user.id)

      const promoterIds = (promotersData ?? []).map(
        (p: { id: string }) => p.id
      )

      let linksData: any[] = []

      if (promoterIds && promoterIds.length > 0) {
        // 1. Fetch Links
        const { data, error } = await supabase
          .from('promoter_links')
          .select(`
            id,
            slug,
            limite_generacion, 
            usados,
            link_url,
            event_zones (
              id,
              club_zones ( nombre ),
              events(
                nombre,
                fecha_inicio,
                clubs ( nombre )
              )
            ),
            boxes ( numero )
          `)
          .in('promoter_id', promoterIds)

        if (error) {
          console.error('Error fetching links:', error)
        } else {
          linksData = data ?? []
        }

        // 2. Fetch Tickets for these links
        if (linksData.length > 0) {
          const linkIds = linksData.map(l => l.id)
          const { data: ticketsData, error: ticketsError } = await supabase
            .from('tickets')
            .select(`
              id,
              codigo,
              created_at,
              promoter_link_id,
              users ( nombre, email )
            `)
            .in('promoter_link_id', linkIds)
            .order('created_at', { ascending: false })

          if (ticketsError) {
            console.error('Error fetching tickets:', ticketsError)
          } else {
            // Attach tickets to links
            linksData = linksData.map(link => ({
              ...link,
              tickets: ticketsData?.filter((t: any) => t.promoter_link_id === link.id) || []
            }))
          }
        }
      }

      setPromoterLinks(linksData as PromoterLink[])
      setLoading(false)
    }

    fetchPromoterData()
  }, [router, supabase])

  // Group links by Event Name and split by date
  const { activeGrouped, pastGrouped } = useMemo(() => {
    const active: Record<string, PromoterLink[]> = {}
    const past: Record<string, PromoterLink[]> = {}
    const now = new Date()

    promoterLinks.forEach(link => {
      const eventName = link.event_zones?.events?.nombre || 'Evento Desconocido'
      const eventDateStr = link.event_zones?.events?.fecha_inicio
      const eventDate = eventDateStr ? new Date(eventDateStr) : new Date()

      // Check if event is in the past (yesterday or before)
      // We consider "active" if it's today or future
      // Simple comparison: if eventDate < now (minus some buffer if needed, but strict for now)
      // Let's say if event date is before today's start of day, it's past.

      // Actually, usually "active" means upcoming or today.
      // Let's just compare timestamps.

      if (eventDate < now) {
        if (!past[eventName]) past[eventName] = []
        past[eventName].push(link)
      } else {
        if (!active[eventName]) active[eventName] = []
        active[eventName].push(link)
      }
    })
    return { activeGrouped: active, pastGrouped: past }
  }, [promoterLinks])

  // ---------------------------
  // LOADING
  // ---------------------------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center " style={{
        background: 'linear-gradient(135deg, #1a0b2e 0%, #2d1b4e 50%, #4a2c6d 100%)',
        minHeight: '100vh'
      }}>
        <p className="text-muted-foreground">Cargando tu panel de promotor...</p>
      </div>
    )
  }

  // ---------------------------
  // VIEW
  // ---------------------------
  return (
    <div className="min-h-screen p-4 sm:p-8 text-foreground" style={{
      background: 'linear-gradient(135deg, #1a0b2e 0%, #2d1b4e 50%, #4a2c6d 100%)',
      minHeight: '100vh'
    }}>

      {/* NAVBAR */}
      <nav className="flex justify-between items-center mb-8 p-4 bg-card/50 rounded-lg shadow-sm backdrop-blur-sm">
        <h1 className="text-2xl font-bold">Mis Enlaces</h1>
        <div className="flex space-x-4">
          <Button asChild variant="ghost">
            <Link href="/dashboard/profile">Mi Perfil</Link>
          </Button>
          <Button
            variant="outline"
            className="bg-transparent border-white/20 hover:bg-white/10"
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/login')
            }}
          >
            Cerrar Sesión
          </Button>
        </div>
      </nav>

      {/* CONTENT */}
      <div className="max-w-4xl mx-auto">
        <Tabs defaultValue="proximos" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-card/30">
            <TabsTrigger value="proximos">Próximos</TabsTrigger>
            <TabsTrigger value="anteriores">Anteriores</TabsTrigger>
          </TabsList>

          <TabsContent value="proximos" className="space-y-6">
            {Object.keys(activeGrouped).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(activeGrouped).map(([eventName, links]) => {
                  const firstLink = links[0]
                  const eventDate = firstLink.event_zones?.events?.fecha_inicio || new Date()
                  const clubName = firstLink.event_zones?.events?.clubs?.nombre || 'Club'

                  return (
                    <TicketCard
                      key={eventName}
                      eventName={eventName}
                      eventLocation={clubName}
                      eventDate={eventDate}
                      ticketCount={links.length}
                      eventImage="/placeholder.svg?height=100&width=100"
                      onClick={() => {
                        setSelectedLinks(links)
                        setDialogOpen(true)
                      }}
                    />
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-16 border-2 border-dashed border-white/20 rounded-lg bg-card/10">
                <p className="text-muted-foreground">No tienes enlaces de eventos próximos.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="anteriores" className="space-y-6">
            {Object.keys(pastGrouped).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(pastGrouped).map(([eventName, links]) => {
                  const firstLink = links[0]
                  const eventDate = firstLink.event_zones?.events?.fecha_inicio || new Date()
                  const clubName = firstLink.event_zones?.events?.clubs?.nombre || 'Club'

                  return (
                    <TicketCard
                      key={eventName}
                      eventName={eventName}
                      eventLocation={clubName}
                      eventDate={eventDate}
                      ticketCount={links.length}
                      eventImage="/placeholder.svg?height=100&width=100"
                      onClick={() => {
                        setSelectedLinks(links)
                        setDialogOpen(true)
                      }}
                    />
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-16 border-2 border-dashed border-white/20 rounded-lg bg-card/10">
                <p className="text-muted-foreground">No tienes enlaces de eventos pasados.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <PromoterLinkDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        links={selectedLinks}
      />
    </div>
  )
}
