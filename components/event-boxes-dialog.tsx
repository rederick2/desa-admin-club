'use client'

import { useState } from 'react'
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
import { Button } from '@/components/ui/button'
import { Link as LinkIcon, Copy, Check } from 'lucide-react'
import { GenerateTicketLinkDialog } from './generate-ticket-link-dialog'

import type { Box } from '@/app/dashboard/[clubId]/events/[eventId]/zones/page'

interface Promoter {
  id: string;
  users: { nombre: string } | null;
}

interface EventBoxesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  zoneName: string
  boxes: Box[]
  promoters: Promoter[]
  eventZoneId: string
}

export function EventBoxesDialog({
  open,
  onOpenChange,
  zoneName,
  boxes,
  promoters,
  eventZoneId,
}: EventBoxesDialogProps) {
  const [generateLinkDialogOpen, setGenerateLinkDialogOpen] = useState(false)
  const [selectedBox, setSelectedBox] = useState<Box | null>(null)
  const [copiedBoxId, setCopiedBoxId] = useState<string | null>(null)

  const handleOpenGenerateLink = (box: Box) => {
    setSelectedBox(box)
    setGenerateLinkDialogOpen(true)
  }

  const handleLinkGenerated = () => {
    setGenerateLinkDialogOpen(false)
    // TODO: Refresh the boxes list to show the new "Copy Link" button
    onOpenChange(false) // Close and force re-open to refresh data for now
  }

  const handleCopyLink = (slug: string, boxId: string) => {
    const linkUrl = `${window.location.origin}/invite/${slug}`
    navigator.clipboard.writeText(linkUrl)
    setCopiedBoxId(boxId)
    setTimeout(() => setCopiedBoxId(null), 2000)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
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
                <TableHead>Acciones</TableHead>
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
                  <TableCell>
                    {box.promoter_links && box.promoter_links.length > 0 ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCopyLink(box.promoter_links[0].slug, box.id)}
                      >
                        {copiedBoxId === box.id ? (
                          <Check className="w-4 h-4 mr-2" />
                        ) : (
                          <Copy className="w-4 h-4 mr-2" />
                        )}
                        Copiar Link
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenGenerateLink(box)}
                      >
                        <LinkIcon className="w-4 h-4 mr-2" />
                        Generar Link
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        </DialogContent>
      </Dialog>

      {selectedBox && (
        <GenerateTicketLinkDialog
          open={generateLinkDialogOpen}
          onOpenChange={setGenerateLinkDialogOpen}
          eventZoneId={eventZoneId}
          boxId={selectedBox.id}
          zoneName={`Box #${selectedBox.numero}`}
          zoneCapacity={selectedBox.capacidad}
          promoters={promoters}
          onLinkGenerated={handleLinkGenerated}
          isBox
        />
      )}
    </>
  )
}