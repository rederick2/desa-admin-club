'use client'

import { useState, useEffect } from 'react'
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
import { Copy, Trash2, Check } from 'lucide-react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface PromoterLink {
  id: string
  slug: string
  limite_generacion: number
  usados: number
  promoters: {
    users: {
      nombre: string
    } | null
  } | null
  boxes: {
    numero: number
  } | null
}

interface ViewTicketLinksDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventZoneId: string
  zoneName: string
  isBoxZone?: boolean
}

export function ViewTicketLinksDialog({
  open,
  onOpenChange,
  eventZoneId,
  zoneName,
  isBoxZone = false,
}: ViewTicketLinksDialogProps) {
  const [links, setLinks] = useState<PromoterLink[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [linkToDelete, setLinkToDelete] = useState<PromoterLink | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (open) {
      fetchLinks()
    }
  }, [open, eventZoneId])

  const fetchLinks = async () => {
    setLoading(true)
    try {
      const selectQuery = isBoxZone
        ? 'id, slug, limite_generacion, usados, promoters(users(nombre)), boxes(numero)'
        : 'id, slug, limite_generacion, usados, promoters(users(nombre))'
      const { data, error } = await supabase
        .from('promoter_links')
        .select(selectQuery)
        .eq('event_zone_id', eventZoneId)

      if (error) throw error
      setLinks(data || [])
    } catch (err) {
      console.error('Error fetching links:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (slug: string) => {
    const linkUrl = `${window.location.origin}/invite/${slug}`
    navigator.clipboard.writeText(linkUrl)
    setCopiedLink(slug)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  const handleDelete = async () => {
    if (!linkToDelete) return
    try {
      const { error } = await supabase.from('promoter_links').delete().eq('id', linkToDelete.id)
      if (error) throw error
      setLinks(links.filter(link => link.id !== linkToDelete.id))
    } catch (err) {
      console.error('Error deleting link:', err)
    } finally {
      setLinkToDelete(null)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Links para "{zoneName}"</DialogTitle>
            <DialogDescription>Listado de links de invitación generados.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? <p>Cargando...</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {isBoxZone && <TableHead>Box</TableHead>}
                    <TableHead>Promotor</TableHead>
                    <TableHead>Uso</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((link) => (
                    <TableRow key={link.id}>
                      {isBoxZone && (
                        <TableCell>Box #{link.boxes?.numero || 'N/A'}</TableCell>
                      )}
                      <TableCell>{link.promoters?.users?.nombre || 'General'}</TableCell>
                      <TableCell>{link.usados} / {link.limite_generacion}</TableCell>
                      <TableCell className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleCopy(link.slug)}>
                          {copiedLink === link.slug ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setLinkToDelete(link)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!linkToDelete} onOpenChange={() => setLinkToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción eliminará el link permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}