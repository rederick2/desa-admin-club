'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Download } from 'lucide-react'
import type { Box } from '@/app/dashboard/[clubId]/events/[eventId]/zones/page'

interface Ticket {
  id: string
  codigo: string
  usado: boolean
  users: {
    nombre: string
    email: string
  } | null
  promoters: {
    users: {
      nombre: string
    } | null
  } | null
  promoter_links: {
    boxes: {
      id: string
      numero: number
    } | null
  } | null
}

interface ViewTicketsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventZoneId: string
  zoneName: string
  isBoxZone?: boolean
  boxes?: Box[] | null
  initialBoxId?: string | null
  initialBoxNumber?: number | null
  viewMap?: boolean
}

export function ViewTicketsDialog({
  open,
  onOpenChange,
  eventZoneId,
  zoneName,
  isBoxZone = false,
  boxes = [],
  initialBoxId = null,
  initialBoxNumber = null,
  viewMap = false,
}: ViewTicketsDialogProps) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBoxId, setSelectedBoxId] = useState<string>('all')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (open) {
      fetchTickets()
      setSelectedBoxId(initialBoxId ? initialBoxId.toString() : 'all')
    }
  }, [open, eventZoneId, initialBoxId, viewMap])

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const selectQuery = isBoxZone
        ? 'id, codigo, usado, users(nombre, email), promoters(users(nombre)), promoter_links(boxes(id, numero))'
        : 'id, codigo, usado, users(nombre, email), promoters(users(nombre))'
      /*const { data, error } = await supabase
        .from('tickets')
        .select(selectQuery)
        .eq('event_zone_id', eventZoneId)*/

      let query = supabase
        .from('tickets')
        .select(selectQuery);

      if (isBoxZone && viewMap) {
        // Buscar tickets por los box_id que pertenecen a esta zona
        query = query.eq('promoter_links.box_id', initialBoxId)
      } else {
        // Buscar tickets por zona general
        query = query.eq('event_zone_id', eventZoneId)
      }

      const { data, error } = await query;

      if (error) throw error
      setTickets(data || [])
    } catch (err) {
      console.error('Error fetching tickets:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const matchesSearch = ticket.users?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesBox = selectedBoxId === 'all' ||
        (ticket.promoter_links?.boxes?.id.toString() === selectedBoxId)

      return matchesSearch && matchesBox
    })
  }, [tickets, searchTerm, selectedBoxId])

  const handleExport = () => {
    const headers = ['Nombre', 'Email', 'Código', 'Promotor', 'Estado']
    const rows = filteredTickets.map(ticket => [
      ticket.users?.nombre || 'N/A',
      ticket.users?.email || 'N/A',
      ticket.codigo,
      ticket.promoters?.users?.nombre || 'General',
      ticket.usado ? 'Usado' : 'No usado'
    ])

    let csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `tickets_${zoneName.replace(/\s+/g, '_')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Tickets para "{zoneName}" {isBoxZone && viewMap && `Box ${initialBoxNumber}`}</DialogTitle>
          <DialogDescription>Listado de tickets generados para esta zona.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2 justify-between items-center">
          <Input
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? <p>Cargando...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isBoxZone && !viewMap && <TableHead>Box</TableHead>}
                  <TableHead>Nombre</TableHead>
                  <TableHead>Promotor</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    {isBoxZone && !viewMap && (
                      <TableCell>Box #{ticket.promoter_links?.boxes?.numero || 'N/A'}</TableCell>
                    )}
                    <TableCell>{ticket.users?.nombre || 'N/A'}</TableCell>
                    <TableCell>{ticket.promoters?.users?.nombre || 'General'}</TableCell>
                    <TableCell>{ticket.codigo.substring(0, 11)}</TableCell>
                    <TableCell>
                      <Badge variant={ticket.usado ? 'secondary' : 'default'}>
                        {ticket.usado ? 'Usado' : 'No usado'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}