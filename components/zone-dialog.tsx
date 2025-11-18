'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ZoneDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  zone?: {
    id: string
    nombre: string
    tipo: string
    aforo_maximo: number
    precio?: number
    color?: string
  } | null
  eventId: string
  onSave: () => void
}

export function ZoneDialog({
  open,
  onOpenChange,
  zone,
  eventId,
  onSave,
}: ZoneDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'General',
    aforo_maximo: '',
    precio: '',
    color: '#3b82f6',
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (zone) {
      setFormData({
        nombre: zone.nombre,
        tipo: zone.tipo,
        aforo_maximo: zone.aforo_maximo.toString(),
        precio: zone.precio?.toString() || '',
        color: zone.color || '#3b82f6',
      })
    } else {
      setFormData({
        nombre: '',
        tipo: 'General',
        aforo_maximo: '',
        precio: '',
        color: '#3b82f6',
      })
    }
  }, [zone, open])

  const handleSubmit = async () => {
    setLoading(true)

    try {
      const payload = {
        nombre: formData.nombre,
        tipo: formData.tipo,
        aforo_maximo: parseInt(formData.aforo_maximo),
        precio: formData.precio ? parseFloat(formData.precio) : null,
        color: formData.color,
      }

      if (zone) {
        const { error } = await supabase
          .from('event_zones')
          .update(payload)
          .eq('id', zone.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('event_zones').insert([
          {
            ...payload,
            event_id: eventId,
          },
        ])

        if (error) throw error
      }

      onSave()
      onOpenChange(false)
    } catch (error) {
      console.error('Error:', error)
      alert('Error al guardar la zona')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {zone ? 'Editar zona' : 'Agregar zona'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) =>
                setFormData({ ...formData, nombre: e.target.value })
              }
              placeholder="ej: VIP, General, Backstage"
            />
          </div>

          <div>
            <Label htmlFor="tipo">Tipo</Label>
            <Select value={formData.tipo} onValueChange={(value) =>
              setFormData({ ...formData, tipo: value })
            }>
              <SelectTrigger id="tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="General">General</SelectItem>
                <SelectItem value="VIP">VIP</SelectItem>
                <SelectItem value="Box">Box</SelectItem>
                <SelectItem value="Backstage">Backstage</SelectItem>
                <SelectItem value="Otra">Otra</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="aforo">Aforo máximo</Label>
              <Input
                id="aforo"
                type="number"
                value={formData.aforo_maximo}
                onChange={(e) =>
                  setFormData({ ...formData, aforo_maximo: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="precio">Precio (opcional)</Label>
              <Input
                id="precio"
                type="number"
                step="0.01"
                value={formData.precio}
                onChange={(e) =>
                  setFormData({ ...formData, precio: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="color">Color</Label>
            <div className="flex gap-2">
              <input
                id="color"
                type="color"
                value={formData.color}
                onChange={(e) =>
                  setFormData({ ...formData, color: e.target.value })
                }
                className="w-12 h-10 border border-border rounded cursor-pointer"
              />
              <Input
                type="text"
                value={formData.color}
                onChange={(e) =>
                  setFormData({ ...formData, color: e.target.value })
                }
                readOnly
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !formData.nombre || !formData.aforo_maximo}
          >
            {zone ? 'Actualizar' : 'Crear'} zona
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
