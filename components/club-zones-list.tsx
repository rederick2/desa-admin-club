'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { ClubZoneDialog } from './club-zone-dialog'

interface ClubZone {
  id: string
  nombre: string
  descripcion: string
  orden: number
  club_id: string
  es_zona_boxes: boolean
  cantidad_boxes: number | null
}

export function ClubZonesList({ clubId }: { clubId: string }) {
  const [zones, setZones] = useState<ClubZone[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingZone, setEditingZone] = useState<ClubZone | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [zoneToDelete, setZoneToDelete] = useState<ClubZone | null>(null)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadZones()
  }, [clubId])

  const loadZones = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('club_zones')
        .select('*')
        .eq('club_id', clubId)
        .order('orden', { ascending: true })

      if (error) throw error
      setZones(data || [])
    } catch (error) {
      console.error('[v0] Error loading zones:', error)
    } finally {
      setLoading(false)
    }
  }

  const openDeleteDialog = (zone: ClubZone) => {
    setZoneToDelete(zone)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!zoneToDelete) return
    try {
      const { error } = await supabase
        .from('club_zones')
        .delete()
        .eq('id', zoneToDelete.id)
        .eq('club_id', clubId)

      if (error) throw error
      setZones(zones.filter(z => z.id !== zoneToDelete.id))
    } catch (error) {
      console.error('[v0] Error deleting zone:', error)
    } finally {
      setDeleteDialogOpen(false)
      setZoneToDelete(null)
    }
  }

  const handleZoneSaved = () => {
    loadZones()
    setEditingZone(null)
    setDialogOpen(false)
  }

  if (loading) {
    return <div className="p-8">Cargando zonas...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Zonas del Club</h1>
        <Button
          onClick={() => {
            setEditingZone(null)
            setDialogOpen(true)
          }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Crear zona
        </Button>
      </div>

      {zones.length === 0 ? (
        <Card>
          <CardContent className="pt-8 text-center text-muted-foreground">
            No hay zonas creadas. Crea la primera zona para tu club.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {zones.map(zone => (
            <Card key={zone.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle>{zone.nombre}</CardTitle>
                    <Badge variant={zone.es_zona_boxes ? "default" : "secondary"}>
                      {zone.es_zona_boxes ? `${zone.cantidad_boxes} Boxes` : 'Zona Normal'}
                    </Badge>
                  </div>
                  {zone.descripcion && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {zone.descripcion}
                    </p>
                  )}
                </div>
                <Badge variant="outline">Orden: {zone.orden}</Badge>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingZone(zone)
                      setDialogOpen(true)
                    }}
                    className="gap-2"
                  >
                    <Pencil className="w-4 h-4" />
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => openDeleteDialog(zone)}
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ClubZoneDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clubId={clubId}
        zone={editingZone}
        onZoneSaved={handleZoneSaved}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la zona
              "{zoneToDelete?.nombre}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
