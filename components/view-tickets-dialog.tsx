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
  boxes?: Box[]
}

export function ViewTicketsDialog({
  open,
  onOpenChange,
  eventZoneId,
  zoneName,
  isBoxZone = false,
  boxes = [],
}: ViewTicketsDialogProps) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (open) {
      fetchTickets()
    }
  }, [open, eventZoneId])

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const selectQuery = isBoxZone
        ? 'id, codigo, usado, users(nombre, email), promoters(users(nombre)), promoter_links(boxes(id, numero))'
        : 'id, codigo, usado, users(nombre, email), promoters(users(nombre))'
      const { data, error } = await supabase
        .from('tickets')
        .select(selectQuery)
        .eq('event_zone_id', eventZoneId)

      if (error) throw error
      setTickets(data || [])
    } catch (err) {
      console.error('Error fetching tickets:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket =>
      ticket.users?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [tickets, searchTerm])

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
          <DialogTitle>Tickets para "{zoneName}"</DialogTitle>
          <DialogDescription>Listado de tickets generados para esta zona.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2 justify-between items-center">
          <Input
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          {isBoxZone && (
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por box" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los boxes</SelectItem>
                {boxes.map(box => (
                  <SelectItem key={box.id} value={box.id.toString()}>
                    Box #{box.numero}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" onClick={handleExport} disabled={filteredTickets.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Exportar a Excel
          </Button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? <p>Cargando...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isBoxZone && <TableHead>Box</TableHead>}
                  <TableHead>Nombre</TableHead>
                  <TableHead>Promotor</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    {isBoxZone && (
                      <TableCell>Box #{ticket.promoter_links?.boxes?.numero || 'N/A'}</TableCell>
                    )}
                    <TableCell>{ticket.users?.nombre || 'N/A'}</TableCell>
                    <TableCell>{ticket.promoters?.users?.nombre || 'General'}</TableCell>
                    <TableCell>{ticket.codigo}</TableCell>
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