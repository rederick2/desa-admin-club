'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Eye, Edit, Layers, Map, BarChart3, Plus, Trash2 } from 'lucide-react'

interface Event {
  id: string
  nombre: string
  fecha_inicio: string
  activo: boolean
  limite_entradas: number
}

interface EventsListProps {
  clubId: string
}

export function EventsList({ clubId }: EventsListProps) {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadEvents()
  }, [clubId])

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, nombre, fecha_inicio, activo, limite_entradas')
        .eq('club_id', clubId)
        .order('fecha_inicio', { ascending: false })

      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('Error loading events:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (activo: boolean) => {
    return (
      <Badge variant={activo ? 'default' : 'secondary'}>
        {activo ? 'Publicado' : 'Borrador'}
      </Badge>
    )
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este evento?')) {
      try {
        await supabase.from('events').delete().eq('id', id)
        setEvents(events.filter((e) => e.id !== id))
      } catch (error) {
        console.error('Error deleting event:', error)
      }
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Cargando eventos...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-foreground">Eventos</h2>
        <Button
          onClick={() => router.push(`/dashboard/${clubId}/events/create`)}
          className="gap-2 w-full md:w-auto"
        >
          <Plus className="w-4 h-4" />
          Crear evento
        </Button>
      </div>

      {
        events.length === 0 ? (
          <div className="text-center py-8 bg-card rounded-lg border border-border">
            <p className="text-muted-foreground mb-4">No hay eventos aún</p>
            <Button onClick={() => router.push(`/dashboard/${clubId}/events/create`)}>
              Crear tu primer evento
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile View - Cards */}
            <div className="grid gap-4 md:hidden">
              {events.map((event) => (
                <Card key={event.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-medium">
                      {event.nombre}
                    </CardTitle>
                    {getStatusBadge(event.activo)}
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fecha:</span>
                        <span>{new Date(event.fecha_inicio).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Límite entradas:</span>
                        <span>{event.limite_entradas || '-'}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2">
                    <div className="flex gap-2 w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/dashboard/${clubId}/events/${event.id}`)
                        }
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/dashboard/${clubId}/events/${event.id}/edit`)
                        }
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                    </div>
                    <div className="flex gap-2 w-full">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          router.push(`/dashboard/${clubId}/events/${event.id}/zones`)
                        }
                        className="flex-1"
                      >
                        <Layers className="w-4 h-4 mr-2" />
                        Zonas
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          router.push(`/dashboard/${clubId}/events/${event.id}/stats`)
                        }
                        className="flex-1"
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Stats
                      </Button>
                    </div>
                    <div className="flex gap-2 w-full">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          router.push(`/dashboard/${clubId}/events/${event.id}/map`)
                        }
                        className="flex-1 text-blue-500 hover:text-blue-600"
                      >
                        <Map className="w-4 h-4 mr-2" />
                        Mapa
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(event.id)}
                        className="flex-1"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {/* Desktop View - Table */}
            <div className="hidden md:block border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Límite entradas</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.nombre}</TableCell>
                      <TableCell>
                        {new Date(event.fecha_inicio).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(event.activo)}</TableCell>
                      <TableCell>{event.limite_entradas || '-'}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/dashboard/${clubId}/events/${event.id}`)
                            }
                            title="Ver"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/dashboard/${clubId}/events/${event.id}/edit`)
                            }
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/dashboard/${clubId}/events/${event.id}/zones`)
                            }
                            title="Zonas"
                          >
                            <Layers className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/dashboard/${clubId}/events/${event.id}/map`)
                            }
                            title="Mapa en Vivo"
                            className="text-blue-500 hover:text-blue-600"
                          >
                            <Map className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/dashboard/${clubId}/events/${event.id}/stats`)
                            }
                            title="Estadísticas"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(event.id)}
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
          </>
        )
      }
    </div>
  )
}
