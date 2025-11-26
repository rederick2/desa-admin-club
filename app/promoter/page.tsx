'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { createBrowserClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { Copy, Check } from 'lucide-react'
import Link from 'next/link'

// ---------------------------
// Interfaces
// ---------------------------

interface PromoterLink {
  id: string
  slug: string
  limite_generacion: number | null
  usados: number | null
  link_url: string | null
  event_zones: {
    id: string
    tipo: string
    events: {
      id: string
      nombre: string
      fecha_inicio: string
    } | null
    club_zones: {
      id: string
      nombre: string
      clubs: {
        id: string
        nombre: string
      } | null
    } | null
  } | null
  boxes: {
    id: string
    numero: number
  } | null
}

interface GroupedLinks {
  [clubName: string]: {
    [eventName: string]: PromoterLink[]
  }
}

// ---------------------------
// Component
// ---------------------------
export default function PromoterPage() {
  const [user, setUser] = useState<User | null>(null)
  const [promoterLinks, setPromoterLinks] = useState<PromoterLink[]>([])
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const groupedLinks = useMemo(() => {
    return promoterLinks.reduce<GroupedLinks>((acc, link) => {
      const clubName = link.event_zones?.club_zones?.clubs?.nombre ?? 'Club General'
      const eventName = link.event_zones?.events?.nombre ?? 'Evento General'

      if (!acc[clubName]) acc[clubName] = {}
      if (!acc[clubName][eventName]) acc[clubName][eventName] = []
      acc[clubName][eventName].push(link)
      return acc
    }, {})
  }, [promoterLinks])

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
      const { data: promotersData, error: promotersError } = await supabase
        .from('promoters')
        .select('id')
        .eq('user_id', user.id)

      const promoterIds = (promotersData ?? []).map(
        (p: { id: string }) => p.id
      )

      let linksData: any[] = []
      let linksError: any = null

      if (promoterIds && promoterIds.length > 0) {
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
              tipo,
              events(
                id,
                nombre,
                fecha_inicio
              ),
              club_zones ( 
                id, 
                nombre, 
                clubs ( id, nombre ) 
              )
            ),
            boxes ( id, numero )
          `)
          .in('promoter_id', promoterIds)


        linksData = data ?? []
        linksError = error
      }

      if (linksError) {
        console.error('Error fetching links:', linksError)
        toast.error('No se pudieron cargar tus enlaces.')
      } else {
        setPromoterLinks(linksData as PromoterLink[])
      }

      setLoading(false)
    }

    fetchPromoterData()
  }, [router, supabase])

  // ---------------------------
  // Copy Functions
  // ---------------------------
  const handleCopy = (slug: string) => {
    const linkUrl = `${window.location.origin}/invite/${slug}`
    navigator.clipboard.writeText(linkUrl)
    setCopiedLink(slug)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  // ---------------------------
  // LOADING
  // ---------------------------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center ">
        <p className="text-muted-foreground">Cargando tu panel de promotor...</p>
      </div>
    )
  }

  // ---------------------------
  // VIEW
  // ---------------------------
  return (
    <div className="min-h-screen  p-4 sm:p-8">

      {/* NAVBAR */}
      <nav className="flex justify-between items-center mb-8 p-4 bg-card rounded-lg shadow-sm">
        <h1 className="text-2xl font-bold text-card-foreground">Panel de Promotor</h1>
        <div className="flex space-x-4">
          <Button asChild variant="ghost">
            <Link href="/dashboard/profile">Mi Perfil</Link>
          </Button>
          <Button
            variant="outline"
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
        <h2 className="text-3xl font-bold mb-6">Mis Enlaces Activos</h2>

        {Object.keys(groupedLinks).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedLinks).map(([clubName, events]) => (
              <Card key={clubName}>
                <CardHeader>
                  <CardTitle className="text-2xl">{clubName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {Object.entries(events).map(([eventName, links]) => (
                      <AccordionItem value={eventName} key={eventName}>
                        <AccordionTrigger className="text-lg font-semibold">
                          {eventName}
                        </AccordionTrigger>
                        <AccordionContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Nombre / Número</TableHead>
                                <TableHead>Uso</TableHead>
                                <TableHead className="text-right">Copiar Enlace</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {links.map((link) => (
                                <TableRow key={link.id}>
                                  <TableCell className="font-medium">
                                    {link.boxes ? 'Box' : 'Zona'}
                                  </TableCell>
                                  <TableCell>
                                    {link.boxes?.numero || link.event_zones?.club_zones?.nombre || 'General'}
                                  </TableCell>
                                  <TableCell>
                                    {link.usados ?? 0} / {link.limite_generacion ?? '∞'}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button size="sm" variant="outline" onClick={() => handleCopy(link.slug)}>
                                      {copiedLink === link.slug ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">No tienes enlaces de venta activos en este momento.</p>
          </div>
        )}
      </div>
    </div>
  )
}
