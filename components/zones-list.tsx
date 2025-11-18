'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Edit, Trash2, Plus, Box } from 'lucide-react'
import { ZoneDialog } from './zone-dialog'

interface Zone {
  id: string
  nombre: string
  tipo: string
  aforo_maximo: number
  precio?: number
  color?: string
}

interface ZonesListProps {
  eventId: string
}

export function ZonesList({ eventId }: ZonesListProps) {
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadZones()
  }, [eventId])

  const loadZones = async () => {
    try {
      const { data, error } = await supabase
        .from('event_zones')
        .select('*')
        .eq('event_id', eventId)
        .order('nombre', { ascending: true })

      if (error) throw error
      setZones(data || [])
    } catch (error) {
      console.error('Error loading zones:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta zona?')) {
      try {
        await supabase.from('event_zones').delete().eq('id', id)
        setZones(zones.filter((z) => z.id !== id))
      } catch (error) {
        console.error('Error deleting zone:', error)
      }
    }
  }

  const handleSave = async () => {
    await loadZones()
    setShowDialog(false)
    setSelectedZone(null)
  }

  if (loading) {
    return <p className="text-muted-foreground">Cargando zonas...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Zonas del evento</h3>
        <Button
          onClick={() => {
            setSelectedZone(null)
            setShowDialog(true)
          }}
          className="gap-2"
          size="sm"
        >
          <Plus className="w-4 h-4" />
          Agregar zona
        </Button>
      </div>

      {zones.length === 0 ? (
        <div className="text-center py-8 bg-card rounded-lg border border-border">
          <p className="text-muted-foreground mb-4">No hay zonas aún</p>
          <Button
            onClick={() => {
              setSelectedZone(null)
              setShowDialog(true)
            }}
            size="sm"
          >
            Crear primera zona
          </Button>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Aforo máximo</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map((zone) => (
                <TableRow key={zone.id}>
                  <TableCell className="font-medium">{zone.nombre}</TableCell>
                  <TableCell className="capitalize">{zone.tipo}</TableCell>
                  <TableCell>{zone.aforo_maximo}</TableCell>
                  <TableCell>${zone.precio || '-'}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {zone.tipo === 'Box' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.location.href = `/dashboard/events/${eventId}/zones/${zone.id}/boxes`
                          }
                          title="Gestionar boxes"
                        >
                          <Box className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedZone(zone)
                          setShowDialog(true)
                        }}
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(zone.id)}
                        title="Eliminar"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ZoneDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        zone={selectedZone}
        eventId={eventId}
        onSave={handleSave}
      />
    </div>
  )
}
