'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Copy, RefreshCw } from 'lucide-react'

interface PromoterLinksProps {
  eventId: string
  eventName: string
}

export function PromoterLinks({ eventId, eventName }: PromoterLinksProps) {
  const [promoters, setPromoters] = useState<any[]>([])
  const [selectedPromoter, setSelectedPromoter] = useState<string>('')
  const [zones, setZones] = useState<any[]>([])
  const [links, setLinks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadData()
  }, [eventId])

  const loadData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // Load promoters
      const { data: promotersData, error: promotersError } = await supabase
        .from('promoters')
        .select('id, nombre, apellido')
        .eq('club_id', user.id)

      if (promotersError) throw promotersError
      setPromoters(promotersData || [])

      // Load zones
      const { data: zonesData, error: zonesError } = await supabase
        .from('event_zones')
        .select('id, nombre')
        .eq('event_id', eventId)

      if (zonesError) throw zonesError
      setZones(zonesData || [])

      // Load links
      const { data: linksData, error: linksError } = await supabase
        .from('promoter_links')
        .select('*')
        .eq('event_id', eventId)

      if (linksError) throw linksError
      setLinks(linksData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateLink = async (promoterId: string, zoneId: string) => {
    try {
      const token = Math.random().toString(36).substring(2, 12).toUpperCase()
      const { error } = await supabase.from('promoter_links').insert([
        {
          promoter_id: promoterId,
          event_id: eventId,
          zone_id: zoneId,
          token,
          usado: 0,
          cupo: 100,
        },
      ])

      if (error) throw error
      await loadData()
    } catch (error) {
      console.error('Error generating link:', error)
      alert('Error al generar el link')
    }
  }

  const regenerateLink = async (linkId: string) => {
    try {
      const token = Math.random().toString(36).substring(2, 12).toUpperCase()
      const { error } = await supabase
        .from('promoter_links')
        .update({ token, usado: 0 })
        .eq('id', linkId)

      if (error) throw error
      await loadData()
    } catch (error) {
      console.error('Error regenerating link:', error)
      alert('Error al regenerar el link')
    }
  }

  const copyToClipboard = (link: string) => {
    navigator.clipboard.writeText(link)
    alert('Link copiado al portapapeles')
  }

  const getPromoterName = (promoterId: string) => {
    const promoter = promoters.find((p) => p.id === promoterId)
    return promoter
      ? `${promoter.nombre} ${promoter.apellido}`
      : 'Desconocido'
  }

  const getZoneName = (zoneId: string) => {
    const zone = zones.find((z) => z.id === zoneId)
    return zone ? zone.nombre : 'Desconocida'
  }

  const filteredLinks = selectedPromoter
    ? links.filter((l) => l.promoter_id === selectedPromoter)
    : links

  if (loading) {
    return <p className="text-muted-foreground">Cargando...</p>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generar nuevo link</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="promoter-select">Promotor</Label>
              <Select value={selectedPromoter} onValueChange={setSelectedPromoter}>
                <SelectTrigger id="promoter-select">
                  <SelectValue placeholder="Seleccionar promotor" />
                </SelectTrigger>
                <SelectContent>
                  {promoters.map((promoter) => (
                    <SelectItem key={promoter.id} value={promoter.id}>
                      {promoter.nombre} {promoter.apellido}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="zone-select">Zona</Label>
              <Select onValueChange={(zoneId) => {
                if (selectedPromoter) {
                  generateLink(selectedPromoter, zoneId)
                }
              }}>
                <SelectTrigger id="zone-select">
                  <SelectValue placeholder="Seleccionar zona" />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                className="w-full"
                disabled={!selectedPromoter}
                onClick={() => {
                  if (selectedPromoter && zones.length > 0) {
                    generateLink(selectedPromoter, zones[0].id)
                  }
                }}
              >
                Generar Link
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-lg font-semibold mb-4">Links por zona y promotor</h3>
        {filteredLinks.length === 0 ? (
          <p className="text-muted-foreground text-center py-8 bg-card rounded-lg">
            No hay links generados aún
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredLinks.map((link) => (
              <Card key={link.id}>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Promotor</p>
                      <p className="font-medium">{getPromoterName(link.promoter_id)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Zona</p>
                      <p className="font-medium">{getZoneName(link.zone_id)}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <Label htmlFor={`link-${link.id}`}>Link de invitación</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id={`link-${link.id}`}
                        type="text"
                        value={`${window.location.origin}/invite/${link.token}`}
                        readOnly
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          copyToClipboard(`${window.location.origin}/invite/${link.token}`)
                        }
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Usado</p>
                      <p className="text-lg font-semibold">{link.usado}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cupo</p>
                      <p className="text-lg font-semibold">{link.cupo}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Disponible</p>
                      <p className="text-lg font-semibold">
                        {Math.max(0, link.cupo - link.usado)}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => regenerateLink(link.id)}
                    className="gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regenerar link
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
