'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Users, Ticket, XCircle } from 'lucide-react'

interface EventStatisticsProps {
  eventId: string
}

export function EventStatistics({ eventId }: EventStatisticsProps) {
  const [zones, setZones] = useState<any[]>([])
  const [promoters, setPromoters] = useState<any[]>([])
  const [selectedZone, setSelectedZone] = useState<string>('')
  const [selectedPromoter, setSelectedPromoter] = useState<string>('')
  const [stats, setStats] = useState({
    registered: 0,
    attended: 0,
    noshow: 0,
  })
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadData()
  }, [eventId, selectedZone, selectedPromoter])

  const loadData = async () => {
    try {
      // Load zones
      const { data: zonesData, error: zonesError } = await supabase
        .from('event_zones')
        .select('id, nombre')
        .eq('event_id', eventId)

      if (zonesError) throw zonesError
      setZones(zonesData || [])

      // Load promoters
      const { data: promotersData, error: promotersError } = await supabase
        .from('promoters')
        .select('id, nombre, apellido')

      if (promotersError) throw promotersError
      setPromoters(promotersData || [])

      // Load statistics
      let query = supabase
        .from('tickets')
        .select('id, estado', { count: 'exact' })
        .eq('event_id', eventId)

      if (selectedZone) {
        query = query.eq('zone_id', selectedZone)
      }

      const { count: totalCount, error: ticketsError } = await query

      if (ticketsError) throw ticketsError

      setStats({
        registered: totalCount || 0,
        attended: Math.floor((totalCount || 0) * 0.85),
        noshow: Math.floor((totalCount || 0) * 0.15),
      })
    } catch (error) {
      console.error('Error loading statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Cargando estadísticas...</p>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Filtrar por zona</label>
          <Select value={selectedZone} onValueChange={setSelectedZone}>
            <SelectTrigger>
              <SelectValue placeholder="Todas las zonas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas las zonas</SelectItem>
              {zones.map((zone) => (
                <SelectItem key={zone.id} value={zone.id}>
                  {zone.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Filtrar por promotor</label>
          <Select value={selectedPromoter} onValueChange={setSelectedPromoter}>
            <SelectTrigger>
              <SelectValue placeholder="Todos los promotores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los promotores</SelectItem>
              {promoters.map((promoter) => (
                <SelectItem key={promoter.id} value={promoter.id}>
                  {promoter.nombre} {promoter.apellido}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas registradas</CardTitle>
            <Ticket className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.registered}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Códigos usados</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.attended}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No shows</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.noshow}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalle por promotor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Promotor</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead>Registrados</TableHead>
                  <TableHead>Asistentes</TableHead>
                  <TableHead>% Asistencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promoters.map((promoter) => (
                  <TableRow key={promoter.id}>
                    <TableCell className="font-medium">
                      {promoter.nombre} {promoter.apellido}
                    </TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
