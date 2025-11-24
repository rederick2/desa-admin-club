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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Eye, Edit, Trash2, Plus, ToggleLeft as Toggle2 } from 'lucide-react'
import { PromoterDialog } from './promoter-dialog'

interface Promoter {
  id: string
  user_id: string
  club_id: string
  codigo: string
  porcentaje_comision: number
  activo: boolean
  users: {
    nombre: string
    email: string
    telefono?: string
  }
}

interface PromotersListProps {
  clubId: string
}

export function PromotersList({ clubId }: PromotersListProps) {
  const [promoters, setPromoters] = useState<Promoter[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [selectedPromoter, setSelectedPromoter] = useState<Promoter | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadPromoters()
  }, [clubId])

  const loadPromoters = async () => {
    try {
      const { data, error } = await supabase
        .from('promoters')
        .select(`
          id,
          user_id,
          club_id,
          codigo,
          porcentaje_comision,
          activo,
          users (
            nombre,
            email,
            telefono
          )
        `)
        .eq('club_id', clubId)
        .order('codigo', { ascending: true })

      if (error) throw error

      const formattedData = (data || []).map((p: any) => ({
        ...p,
        users: Array.isArray(p.users) ? p.users[0] : p.users
      }))

      setPromoters(formattedData as Promoter[])
    } catch (error) {
      console.error('Error loading promoters:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este promotor?')) {
      try {
        await supabase.from('promoters').delete().eq('id', id)
        setPromoters(promoters.filter((p) => p.id !== id))
      } catch (error) {
        console.error('Error deleting promoter:', error)
      }
    }
  }

  const handleToggleStatus = async (promoter: Promoter) => {
    try {
      const newStatus = !promoter.activo
      await supabase
        .from('promoters')
        .update({ activo: newStatus })
        .eq('id', promoter.id)

      setPromoters(
        promoters.map((p) =>
          p.id === promoter.id ? { ...p, activo: newStatus } : p
        )
      )
    } catch (error) {
      console.error('Error toggling status:', error)
    }
  }

  const handleSave = async () => {
    await loadPromoters()
    setShowDialog(false)
    setSelectedPromoter(null)
  }

  const getStatusBadge = (status: boolean) => {
    return status ? (
      <Badge>Activo</Badge>
    ) : (
      <Badge variant="secondary">Inactivo</Badge>
    )
  }

  if (loading) {
    return <p className="text-muted-foreground">Cargando promotores...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-foreground">Promotores</h2>
        <Button
          onClick={() => {
            setSelectedPromoter(null)
            setShowDialog(true)
          }}
          className="gap-2 w-full md:w-auto"
        >
          <Plus className="w-4 h-4" />
          Agregar promotor
        </Button>
      </div>

      {promoters.length === 0 ? (
        <div className="text-center py-8 bg-card rounded-lg border border-border">
          <p className="text-muted-foreground mb-4">No hay promotores aún</p>
          <Button
            onClick={() => {
              setSelectedPromoter(null)
              setShowDialog(true)
            }}
          >
            Crear primer promotor
          </Button>
        </div>
      ) : (
        <>
          {/* Mobile View - Cards */}
          <div className="grid gap-4 md:hidden">
            {promoters.map((promoter) => (
              <Card key={promoter.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">
                    {promoter.users?.nombre || '-'}
                  </CardTitle>
                  {getStatusBadge(promoter.activo)}
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Código:</span>
                      <span className="font-mono">{promoter.codigo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span>{promoter.users?.email || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Teléfono:</span>
                      <span>{promoter.users?.telefono || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Comisión:</span>
                      <span>{promoter.porcentaje_comision}%</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedPromoter(promoter)
                      setShowDialog(true)
                    }}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleStatus(promoter)}
                    className="flex-1"
                  >
                    <Toggle2 className="w-4 h-4 mr-2" />
                    {promoter.activo ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDelete(promoter.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
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
                  <TableHead>Código</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Comisión</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promoters.map((promoter) => (
                  <TableRow key={promoter.id}>
                    <TableCell className="font-medium">
                      {promoter.users?.nombre || '-'}
                    </TableCell>
                    <TableCell>{promoter.codigo}</TableCell>
                    <TableCell>{promoter.users?.email || '-'}</TableCell>
                    <TableCell>{promoter.users?.telefono || '-'}</TableCell>
                    <TableCell>{promoter.porcentaje_comision}%</TableCell>
                    <TableCell>{getStatusBadge(promoter.activo)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPromoter(promoter)
                            setShowDialog(true)
                          }}
                          title="Ver/Editar"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(promoter)}
                          title={
                            promoter.activo
                              ? 'Desactivar'
                              : 'Activar'
                          }
                        >
                          <Toggle2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(promoter.id)}
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
      )}

      <PromoterDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        promoter={selectedPromoter}
        onSave={handleSave}
        clubId={clubId}
      />
    </div>
  )
}
