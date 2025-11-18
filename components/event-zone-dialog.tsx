'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ClubZoneWithInfo {
  id: string
  nombre: string
  es_zona_boxes: boolean
  cantidad_boxes?: number
  club_zone_boxes?: Array<{ id: string; numero_box: number }>
}

interface EventZoneDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  clubId: string
  clubZones: Array<{ id: string; nombre: string }>
  onZoneSaved: () => void
}

interface BoxCapacidad {
  numero_box: number
  capacidad: number
}

export function EventZoneDialog({
  open,
  onOpenChange,
  eventId,
  clubId,
  clubZones,
  onZoneSaved,
}: EventZoneDialogProps) {
  const [clubZoneId, setClubZoneId] = useState('')
  const [selectedZone, setSelectedZone] = useState<ClubZoneWithInfo | null>(null)
  const [capacidad, setCapacidad] = useState('')
  const [precio, setPrecio] = useState('')
  const [boxCapacidades, setBoxCapacidades] = useState<BoxCapacidad[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleZoneSelect = async (zoneId: string) => {
    setClubZoneId(zoneId)
    setError('')

    try {
      const selected = clubZones.find((z) => z.id === zoneId)
      if (!selected) return

      const { data: zoneData, error: zoneError } = await supabase
        .from('club_zones')
        .select('id, nombre, es_zona_boxes, cantidad_boxes, club_zone_boxes(id, numero_box)')
        .eq('id', zoneId)
        .single()

      if (zoneError) throw zoneError

      setSelectedZone(zoneData as ClubZoneWithInfo)

      if (zoneData.es_zona_boxes) {
        const boxes = Array.from({ length: zoneData.cantidad_boxes || 0 }, (_, i) => ({
          numero_box: i + 1,
          capacidad: 10,
        }))
        setBoxCapacidades(boxes)
      }

      setCapacidad('')
      setPrecio('')
    } catch (err) {
      console.error('[v0] Error loading zone:', err)
      setError('Error al cargar la zona')
    }
  }

  const handleBoxCapacidadChange = (index: number, value: string) => {
    const newCapacidades = [...boxCapacidades]
    newCapacidades[index].capacidad = parseInt(value) || 0
    setBoxCapacidades(newCapacidades)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!clubZoneId || !precio) {
      setError('Selecciona una zona y precio')
      return
    }

    if (selectedZone?.es_zona_boxes) {
      if (boxCapacidades.length === 0) {
        setError('No hay boxes configurados')
        return
      }
    } else {
      if (!capacidad) {
        setError('Ingresa la capacidad en personas')
        return
      }
    }

    try {
      setLoading(true)

      const { data: eventZoneData, error: eventZoneError } = await supabase
        .from('event_zones')
        .insert({
          event_id: eventId,
          club_zone_id: clubZoneId,
          tipo: selectedZone?.es_zona_boxes ? 'boxes' : 'normal',
          capacidad: selectedZone?.es_zona_boxes ? boxCapacidades.length : parseInt(capacidad),
          precio: parseFloat(precio),
          activo: true,
        })
        .select()
        .single()

      if (eventZoneError) throw eventZoneError

      if (selectedZone?.es_zona_boxes && eventZoneData) {
        const boxesInsert = boxCapacidades.map((box) => ({
          numero: box.numero_box,
          capacidad: box.capacidad,
          event_zone_id: eventZoneData.id,
          estado: 'disponible',
        }))

        const { error: boxesError } = await supabase
          .from('boxes')
          .insert(boxesInsert)

        if (boxesError) throw boxesError
      }

      onZoneSaved()
    } catch (err) {
      console.error('[v0] Error saving event zone:', err)
      setError('Error al guardar la zona del evento')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setClubZoneId('')
    setSelectedZone(null)
    setCapacidad('')
    setPrecio('')
    setBoxCapacidades([])
    setError('')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) handleReset()
        onOpenChange(newOpen)
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agregar zona al evento</DialogTitle>
          <DialogDescription>
            Selecciona una zona del club y configura la capacidad
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="clubZone">Zona del club *</Label>
            <Select value={clubZoneId} onValueChange={handleZoneSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una zona" />
              </SelectTrigger>
              <SelectContent>
                {clubZones.map((zone) => (
                  <SelectItem key={zone.id} value={zone.id}>
                    {zone.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedZone && !selectedZone.es_zona_boxes && (
            <div>
              <Label htmlFor="capacidad">Capacidad (personas) *</Label>
              <Input
                id="capacidad"
                type="number"
                min={1}
                value={capacidad}
                onChange={(e) => setCapacidad(e.target.value)}
                placeholder="ej: 400"
                disabled={loading}
              />
            </div>
          )}

          {selectedZone?.es_zona_boxes && boxCapacidades.length > 0 && (
            <div className="space-y-3">
              <Label>Configurar capacidad por box</Label>
              <div className="grid gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {boxCapacidades.map((box, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Label className="min-w-16">Box {box.numero_box}:</Label>
                    <Input
                      type="number"
                      min={1}
                      value={box.capacidad}
                      onChange={(e) => handleBoxCapacidadChange(index, e.target.value)}
                      placeholder="Capacidad"
                      disabled={loading}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">personas</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="precio">Precio por entrada *</Label>
            <Input
              id="precio"
              type="number"
              min={0}
              step={0.01}
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="ej: 50.00"
              disabled={loading}
            />
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Agregar zona'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
