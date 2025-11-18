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

interface BoxDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  box?: {
    id: string
    nombre: string
    capacidad: number
    estado: 'disponible' | 'reservado' | 'bloqueado'
  } | null
  zoneId: string
  onSave: () => void
}

export function BoxDialog({
  open,
  onOpenChange,
  box,
  zoneId,
  onSave,
}: BoxDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    capacidad: '',
    estado: 'disponible' as const,
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (box) {
      setFormData({
        nombre: box.nombre,
        capacidad: box.capacidad.toString(),
        estado: box.estado,
      })
    } else {
      setFormData({
        nombre: '',
        capacidad: '',
        estado: 'disponible',
      })
    }
  }, [box, open])

  const handleSubmit = async () => {
    setLoading(true)

    try {
      const payload = {
        nombre: formData.nombre,
        capacidad: parseInt(formData.capacidad),
        estado: formData.estado,
      }

      if (box) {
        const { error } = await supabase
          .from('club_zones')
          .update(payload)
          .eq('id', box.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('club_zones').insert([
          {
            ...payload,
            zone_id: zoneId,
          },
        ])

        if (error) throw error
      }

      onSave()
      onOpenChange(false)
    } catch (error) {
      console.error('Error:', error)
      alert('Error al guardar el box')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {box ? 'Editar box' : 'Agregar box'}
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
              placeholder="ej: Box 1, Mesa VIP 3"
            />
          </div>

          <div>
            <Label htmlFor="capacidad">Capacidad</Label>
            <Input
              id="capacidad"
              type="number"
              value={formData.capacidad}
              onChange={(e) =>
                setFormData({ ...formData, capacidad: e.target.value })
              }
              placeholder="Número de personas"
              required
            />
          </div>

          <div>
            <Label htmlFor="estado">Estado inicial</Label>
            <Select value={formData.estado} onValueChange={(value: any) =>
              setFormData({ ...formData, estado: value })
            }>
              <SelectTrigger id="estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="disponible">Disponible</SelectItem>
                <SelectItem value="reservado">Reservado</SelectItem>
                <SelectItem value="bloqueado">Bloqueado</SelectItem>
              </SelectContent>
            </Select>
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
            disabled={loading || !formData.nombre || !formData.capacidad}
          >
            {box ? 'Actualizar' : 'Crear'} box
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
