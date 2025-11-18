'use client'

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
import { Badge } from '@/components/ui/badge'

export interface Box {
  id: string
  numero: number
  capacidad: number
  estado: string
}

interface EventBoxesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  zoneName: string
  boxes: Box[]
}

export function EventBoxesDialog({
  open,
onOpenChange,
  zoneName,
  boxes,
}: EventBoxesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Boxes en "{zoneName}"</DialogTitle>
          <DialogDescription>
            Listado de boxes con su capacidad y estado.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Capacidad</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boxes.map((box) => (
                <TableRow key={box.id}>
                  <TableCell>{box.numero}</TableCell>
                  <TableCell>{box.capacidad} personas</TableCell>
                  <TableCell>
                    <Badge variant={box.estado === 'disponible' ? 'default' : 'secondary'}>
                      {box.estado}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
