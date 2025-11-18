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
import { Badge } from '@/components/ui/badge'
import { Edit, Trash2, Plus } from 'lucide-react'
import { BoxDialog } from './box-dialog'

interface Box {
  id: string
  nombre: string
  capacidad: number
  estado: 'disponible' | 'reservado' | 'bloqueado'
}

interface BoxesListProps {
  zoneId: string
  zoneName: string
}

export function BoxesList({ zoneId, zoneName }: BoxesListProps) {
  const [boxes, setBoxes] = useState<Box[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [selectedBox, setSelectedBox] = useState<Box | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadBoxes()
  }, [zoneId])

  const loadBoxes = async () => {
    try {
      const { data, error } = await supabase
        .from('club_zones')
        .select('*')
        .eq('zone_id', zoneId)
        .order('nombre', { ascending: true })

      if (error) throw error
      setBoxes(data || [])
    } catch (error) {
      console.error('Error loading boxes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este box?')) {
      try {
        await supabase.from('club_zones').delete().eq('id', id)
        setBoxes(boxes.filter((b) => b.id !== id))
      } catch (error) {
        console.error('Error deleting box:', error)
      }
    }
  }

  const handleSave = async () => {
    await loadBoxes()
    setShowDialog(false)
    setSelectedBox(null)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      disponible: 'default',
      reservado: 'secondary',
      bloqueado: 'destructive',
    }
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>
  }

  if (loading) {
    return <p className="text-muted-foreground">Cargando boxes...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Boxes - {zoneName}</h3>
        <Button
          onClick={() => {
            setSelectedBox(null)
            setShowDialog(true)
          }}
          className="gap-2"
          size="sm"
        >
          <Plus className="w-4 h-4" />
          Agregar box
        </Button>
      </div>

      {boxes.length === 0 ? (
        <div className="text-center py-8 bg-card rounded-lg border border-border">
          <p className="text-muted-foreground mb-4">No hay boxes aún</p>
          <Button
            onClick={() => {
              setSelectedBox(null)
              setShowDialog(true)
            }}
            size="sm"
          >
            Crear primer box
          </Button>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Capacidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boxes.map((box) => (
                <TableRow key={box.id}>
                  <TableCell className="font-medium">{box.nombre}</TableCell>
                  <TableCell>{box.capacidad} personas</TableCell>
                  <TableCell>{getStatusBadge(box.estado)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedBox(box)
                          setShowDialog(true)
                        }}
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(box.id)}
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

      <BoxDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        box={selectedBox}
        zoneId={zoneId}
        onSave={handleSave}
      />
    </div>
  )
}
