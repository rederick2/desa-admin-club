'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface EventFormProps {
  clubId: string
  eventId?: string
  initialData?: {
    nombre?: string
    descripcion?: string
    fecha_inicio?: string
    fecha_fin?: string
    limite_entradas?: number
    banner_url?: string
  }
}

export function EventForm({ clubId, eventId, initialData }: EventFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nombre: initialData?.nombre || '',
    descripcion: initialData?.descripcion || '',
    fecha_inicio: initialData?.fecha_inicio || '',
    fecha_fin: initialData?.fecha_fin || '',
    limite_entradas: initialData?.limite_entradas || '',
    banner_url: initialData?.banner_url || '',
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSubmit = async (e: React.FormEvent, activo: boolean) => {
    e.preventDefault()
    setLoading(true)

    try {
      const eventPayload = {
        ...formData,
        activo,
        club_id: clubId,
        limite_entradas: formData.limite_entradas ? parseInt(formData.limite_entradas as any) : null,
      }

      if (eventId) {
        const { error } = await supabase
          .from('events')
          .update(eventPayload)
          .eq('id', eventId)

        if (error) throw error
        alert('Evento actualizado')
      } else {
        const { error } = await supabase
          .from('events')
          .insert([eventPayload])

        if (error) throw error
        alert('Evento creado')
      }

      router.push(`/dashboard/${clubId}/events`)
    } catch (error) {
      console.error('Error:', error)
      alert('Error al guardar el evento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {eventId ? 'Editar evento' : 'Crear evento'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nombre">Nombre del evento</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="limite">Límite de entradas</Label>
              <Input
                id="limite"
                type="number"
                value={formData.limite_entradas}
                onChange={(e) =>
                  setFormData({ ...formData, limite_entradas: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="descripcion">Descripción</Label>
            <textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) =>
                setFormData({ ...formData, descripcion: e.target.value })
              }
              className="w-full px-3 py-2 border border-border rounded-md"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fecha_inicio">Fecha y hora de inicio</Label>
              <Input
                id="fecha_inicio"
                type="datetime-local"
                value={formData.fecha_inicio}
                onChange={(e) =>
                  setFormData({ ...formData, fecha_inicio: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="fecha_fin">Fecha y hora de fin</Label>
              <Input
                id="fecha_fin"
                type="datetime-local"
                value={formData.fecha_fin}
                onChange={(e) =>
                  setFormData({ ...formData, fecha_fin: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="banner">URL del banner</Label>
            <Input
              id="banner"
              type="url"
              value={formData.banner_url}
              onChange={(e) =>
                setFormData({ ...formData, banner_url: e.target.value })
              }
              placeholder="https://ejemplo.com/banner.jpg"
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              onClick={(e) => handleSubmit(e, false)}
              disabled={loading}
              variant="outline"
            >
              Guardar como borrador
            </Button>
            <Button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={loading}
            >
              Publicar evento
            </Button>
            <Button
              type="button"
              onClick={() => router.back()}
              variant="outline"
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
