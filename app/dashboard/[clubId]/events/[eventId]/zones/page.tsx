'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Eye, Link as LinkIcon, Ticket, List } from 'lucide-react'
import { EventZoneDialog } from '@/components/event-zone-dialog'
import { EventBoxesDialog } from '@/components/event-boxes-dialog'
import { GenerateTicketLinkDialog } from '@/components/generate-ticket-link-dialog'
import { ViewTicketsDialog } from '@/components/view-tickets-dialog'
import { ViewTicketLinksDialog } from '@/components/view-ticket-links-dialog'

export interface Box {
  id: string
  numero: number
  capacidad: number
  estado: string
  promoter_links: {
    slug: string
  }[]
}

interface EventZone {
  id: string
  club_zone_id: string
  capacidad: number
  precio: number
  activo: boolean
  club_zones: {
    nombre: string
    es_zona_boxes: boolean
  }
}

interface ClubZoneForDialog {
  id: string;
  nombre: string;
  es_zona_boxes: boolean;
  cantidad_boxes: number | null;
  orden?: number;
}

interface PromoterForDialog {
  id: string;
  users: { nombre: string } | null;
}

export default function EventZonesPage() {
  const params = useParams()
  const clubId = params.clubId as string
  const eventId = params.eventId as string
  const router = useRouter()

  const [zones, setZones] = useState<EventZone[]>([]);
  const [clubZones, setClubZones] = useState<ClubZoneForDialog[]>([]);
  const [promoters, setPromoters] = useState<PromoterForDialog[]>([]);
  const [loading, setLoading] = useState(true)
  const [availablePromoters, setAvailablePromoters] = useState<PromoterForDialog[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [boxesDialogOpen, setBoxesDialogOpen] = useState(false)
  const [generateLinkDialogOpen, setGenerateLinkDialogOpen] = useState(false)
  const [viewLinksDialogOpen, setViewLinksDialogOpen] = useState(false)
  const [viewTicketsDialogOpen, setViewTicketsDialogOpen] = useState(false)
  const [selectedZoneForView, setSelectedZoneForView] = useState<EventZone | null>(null)
  const [selectedZoneForLink, setSelectedZoneForLink] = useState<EventZone | null>(null)
  const [selectedZoneForBoxes, setSelectedZoneForBoxes] = useState<EventZone | null>(null)
  const [boxesForDialog, setBoxesForDialog] = useState<Box[]>([])

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadData()
  }, [params.eventId])

  const syncZones = async () => {
    if (!confirm('¿Estás seguro? Esto copiará las zonas del club a este evento. Si ya existen, se duplicarán.')) return

    setLoading(true)
    try {
      // 1. Fetch Club Zones
      const { data: clubZones, error: zonesError } = await supabase
        .from('club_zones')
        .select('*')
        .eq('club_id', clubId)

      if (zonesError) throw zonesError
      if (!clubZones || clubZones.length === 0) {
        alert('No hay zonas en el club para copiar.')
        return
      }

      // 2. Create Event Zones
      console.log('Club Zones to copy:', clubZones)
      const eventZonesPayload = clubZones.map(z => ({
        event_id: eventId,
        club_zone_id: z.id,
        tipo: z.es_zona_boxes ? 'boxes' : 'general',
        precio: 0, // Default price
        capacidad: z.cantidad_boxes || 0 // Default capacity
      }))
      console.log('Event Zones Payload:', eventZonesPayload)

      const { data: createdEventZones, error: createZonesError } = await supabase
        .from('event_zones')
        .insert(eventZonesPayload)
        .select()

      if (createZonesError) throw createZonesError
      if (!createdEventZones) return

      // 3. Fetch Club Boxes
      const clubZoneIds = clubZones.map(z => z.id)
      const { data: clubBoxes, error: boxesError } = await supabase
        .from('club_zone_boxes')
        .select('*')
        .in('club_zone_id', clubZoneIds)

      if (boxesError) throw boxesError

      // 4. Create Event Boxes
      if (clubBoxes && clubBoxes.length > 0) {
        const boxesPayload: any[] = []

        createdEventZones.forEach((ez: any) => {
          // Find original club zone boxes
          const zoneBoxes = clubBoxes.filter(b => b.club_zone_id === ez.club_zone_id)

          zoneBoxes.forEach(b => {
            boxesPayload.push({
              event_zone_id: ez.id,
              numero: b.numero_box,
              capacidad: 10,
              estado: 'disponible'
            })
          })
        })

        if (boxesPayload.length > 0) {
          const { error: createBoxesError } = await supabase
            .from('boxes')
            .insert(boxesPayload)

          if (createBoxesError) throw createBoxesError
        }
      }

      alert('Zonas sincronizadas correctamente')
      loadData()

    } catch (error) {
      console.error('Error syncing zones:', error)
      alert('Error al sincronizar zonas')
    } finally {
      setLoading(false)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)

      const [eventZonesResult, clubZonesResult, promotersResult] = await Promise.all([
        supabase
          .from('event_zones')
          .select('*, club_zones!inner(nombre, es_zona_boxes, orden)')
          .eq('event_id', params.eventId),
        supabase
          .from('club_zones')
          .select('id, nombre, es_zona_boxes, cantidad_boxes, orden')
          .eq('club_id', params.clubId),
        supabase
          .from('promoters')
          .select('id, users(nombre)')
          .eq('club_id', params.clubId),
      ]);

      const { data: zonesData, error: zonesError } = eventZonesResult;
      const { data: clubZonesData, error: clubZonesError } = clubZonesResult;
      const { data: promotersData, error: promotersError } = promotersResult;

      if (zonesError || clubZonesError) throw zonesError || clubZonesError;
      const sortedClubZones = (clubZonesData ?? []).sort(
        (a: any, b: any) => (a.orden ?? 0) - (b.orden ?? 0)
      )
      const clubZoneOrderMap = new Map(
        sortedClubZones.map((cz: any, index: number) => [cz.id, index])
      )
      const sortedEventZones = (zonesData ?? []).sort(
        (a: any, b: any) =>
          (clubZoneOrderMap.get(a.club_zone_id) ?? 0) -
          (clubZoneOrderMap.get(b.club_zone_id) ?? 0)
      )
      setZones(sortedEventZones);
      setClubZones(sortedClubZones);
      setPromoters(promotersData || []);
    } catch (err) {
      console.error('[v0] Error loading zones:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (zoneId: string) => {
    try {
      const { error } = await supabase
        .from('event_zones')
        .delete()
        .eq('id', zoneId)

      if (error) throw error;
      setZones(zones.filter(z => z.id !== zoneId));
    } catch (err) {
      console.error('[v0] Error deleting zone:', err)
    }
  }

  const handleViewBoxes = async (zone: EventZone) => {
    if (!zone.club_zones.es_zona_boxes) return

    setSelectedZoneForBoxes(zone)
    try {
      const { data, error } = await supabase
        .from('boxes')
        .select('*, promoter_links(slug)')
        .eq('event_zone_id', zone.id)
        .order('numero', { ascending: true })

      if (error) throw error
      setBoxesForDialog(data || [])
      setBoxesDialogOpen(true)
    } catch (err) {
      console.error('[v0] Error loading boxes for dialog:', err)
    }
  }

  const handleOpenGenerateLink = async (zone: EventZone) => {
    setSelectedZoneForLink(zone);
    try {
      // Fetch promoters who already have a link for this zone
      const { data: existingLinks, error } = await supabase
        .from('promoter_links')
        .select('promoter_id')
        .eq('event_zone_id', zone.id);

      if (error) throw error;

      const linkedPromoterIds = existingLinks.map(link => link.promoter_id);
      const filteredPromoters = promoters.filter(
        promoter => !linkedPromoterIds.includes(promoter.id)
      );
      setAvailablePromoters(filteredPromoters);
      setGenerateLinkDialogOpen(true);
    } catch (err) {
      console.error("Error filtering promoters:", err);
    }
  }

  const handleOpenViewLinks = (zone: EventZone) => {
    setSelectedZoneForView(zone);
    setViewLinksDialogOpen(true);
  }

  const handleOpenViewTickets = (zone: EventZone) => {
    setSelectedZoneForView(zone);
    setViewTicketsDialogOpen(true);
  }

  if (loading) return <div className="p-8">Cargando zonas...</div>

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Zonas del evento</h1>
          <p className="text-muted-foreground">
            Gestiona las zonas y capacidades para este evento
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={syncZones} disabled={loading}>
            <LinkIcon className="w-4 h-4 mr-2" />
            Sincronizar con Club
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            + Agregar zona
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {zones.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No hay zonas agregadas aún
            </CardContent>
          </Card>
        ) : (
          zones.map((zone) => (
            <Card key={zone.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{zone.club_zones.nombre}</CardTitle>
                    <CardDescription>
                      Tipo: {zone.club_zones.es_zona_boxes ? 'Boxes' : 'Normal'}
                    </CardDescription>
                  </div>
                  <Badge variant={zone.activo ? 'default' : 'secondary'}>
                    {zone.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Capacidad</p>
                    <p className="text-lg font-semibold">
                      {zone.capacidad} {zone.club_zones.es_zona_boxes ? 'boxes' : 'personas'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Precio</p>
                    <p className="text-lg font-semibold">
                      ${zone.precio.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  {zone.club_zones.es_zona_boxes && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewBoxes(zone)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Boxes
                    </Button>
                  )}
                  {zone.club_zones.es_zona_boxes && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenViewLinks(zone)}
                    >
                      <List className="w-4 h-4 mr-2" />
                      Ver Links
                    </Button>
                  )}
                  {zone.club_zones.es_zona_boxes && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenViewTickets(zone)}
                    >
                      <Ticket className="w-4 h-4 mr-2" />
                      Ver Tickets
                    </Button>
                  )}
                  {!zone.club_zones.es_zona_boxes && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenGenerateLink(zone)}
                    >
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Generar Link
                    </Button>
                  )}
                  {!zone.club_zones.es_zona_boxes && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenViewLinks(zone)}
                    >
                      <List className="w-4 h-4 mr-2" />
                      Ver Links
                    </Button>
                  )}
                  {!zone.club_zones.es_zona_boxes && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenViewTickets(zone)}
                    >
                      <Ticket className="w-4 h-4 mr-2" />
                      Ver Tickets
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(zone.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <EventZoneDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        eventId={eventId}
        clubId={clubId}
        clubZones={clubZones}
        onZoneSaved={() => {
          setDialogOpen(false);
          loadData()
        }}
      />

      {selectedZoneForBoxes && (
        <EventBoxesDialog
          open={boxesDialogOpen}
          onOpenChange={setBoxesDialogOpen}
          zoneName={selectedZoneForBoxes.club_zones.nombre}
          eventZoneId={selectedZoneForBoxes.id}
          boxes={boxesForDialog}
          promoters={promoters}
        />
      )}

      {selectedZoneForLink && (
        <GenerateTicketLinkDialog
          open={generateLinkDialogOpen}
          onOpenChange={setGenerateLinkDialogOpen}
          eventZoneId={selectedZoneForLink.id}
          zoneName={selectedZoneForLink.club_zones.nombre}
          zoneCapacity={selectedZoneForLink.capacidad}
          promoters={availablePromoters}
          onLinkGenerated={() => {
            // Opcional: podrías recargar los links aquí si los mostraras en la página principal
          }}
        />
      )}

      {selectedZoneForView && (
        <ViewTicketLinksDialog
          open={viewLinksDialogOpen}
          onOpenChange={setViewLinksDialogOpen}
          eventZoneId={selectedZoneForView.id}
          zoneName={selectedZoneForView.club_zones.nombre}
          isBoxZone={selectedZoneForView.club_zones.es_zona_boxes}
        />
      )}

      {selectedZoneForView && (
        <ViewTicketsDialog
          open={viewTicketsDialogOpen}
          onOpenChange={setViewTicketsDialogOpen}
          eventZoneId={selectedZoneForView.id}
          zoneName={selectedZoneForView.club_zones.nombre}
          isBoxZone={selectedZoneForView.club_zones.es_zona_boxes}
          boxes={boxesForDialog}
        />
      )}
    </div>
  )
}
