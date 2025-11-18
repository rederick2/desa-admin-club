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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

interface ClubZone {
  id: string
  nombre: string
  descripcion: string
  orden: number
  club_id: string
  es_zona_boxes: boolean
  cantidad_boxes: number | null
}

interface ClubZoneDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clubId: string
  zone?: ClubZone | null
  onZoneSaved: () => void
}

export function ClubZoneDialog({
  open,
  onOpenChange,
  clubId,
  zone,
  onZoneSaved,
}: ClubZoneDialogProps) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [orden, setOrden] = useState(1)
  const [esZonaBoxes, setEsZonaBoxes] = useState(false)
  const [cantidadBoxes, setCantidadBoxes] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (zone) {
      setNombre(zone.nombre)
      setDescripcion(zone.descripcion || '')
      setOrden(zone.orden)
      setEsZonaBoxes(zone.es_zona_boxes || false)
      setCantidadBoxes(zone.cantidad_boxes || 1)
    } else {
      setNombre('')
      setDescripcion('')
      setOrden(1)
      setEsZonaBoxes(false)
      setCantidadBoxes(1)
    }
    setError('')
  }, [zone, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!nombre.trim()) {
      setError('El nombre de la zona es requerido')
      return
    }

    if (esZonaBoxes && cantidadBoxes < 1) {
      setError('La cantidad de boxes debe ser al menos 1')
      return
    }

    try {
      setLoading(true)

      if (zone) {
        const { error: updateError } = await supabase
          .from('club_zones')
          .update({
            nombre,
            descripcion,
            orden,
            es_zona_boxes: esZonaBoxes,
            cantidad_boxes: esZonaBoxes ? cantidadBoxes : null,
          })
          .eq('id', zone.id)
          .eq('club_id', clubId)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('club_zones')
          .insert({
            nombre,
            descripcion,
            orden,
            club_id: clubId,
            es_zona_boxes: esZonaBoxes,
            cantidad_boxes: esZonaBoxes ? cantidadBoxes : null,
          })

        if (insertError) throw insertError
      }

      onZoneSaved()
    } catch (err) {
      console.error('[v0] Error saving zone:', err)
      setError('Error al guardar la zona')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {zone ? 'Editar zona' : 'Crear nueva zona'}
          </DialogTitle>
          <DialogDescription>
            Define los detalles de la zona del club
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nombre">Nombre de la zona *</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="ej: General, VIP, Box Premium"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción opcional de la zona"
              disabled={loading}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="orden">Orden de visualización</Label>
            <Input
              id="orden"
              type="number"
              min={1}
              value={orden}
              onChange={(e) => setOrden(parseInt(e.target.value))}
              disabled={loading}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="esZonaBoxes"
              checked={esZonaBoxes}
              onCheckedChange={setEsZonaBoxes}
              disabled={loading}
            />
            <Label htmlFor="esZonaBoxes" className="cursor-pointer">
              ¿Es una zona de boxes?
            </Label>
          </div>

          {esZonaBoxes && (
            <div>
              <Label htmlFor="cantidadBoxes">Cantidad de boxes *</Label>
              <Input
                id="cantidadBoxes"
                type="number"
                min={1}
                value={cantidadBoxes}
                onChange={(e) => setCantidadBoxes(parseInt(e.target.value))}
                disabled={loading}
                placeholder="ej: 8, 10, 12"
              />
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive">
              {error}
            </div>
          )}

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
              {loading ? 'Guardando...' : 'Guardar zona'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
