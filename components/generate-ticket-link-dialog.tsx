'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Copy, Check } from 'lucide-react'

interface Promoter {
  id: string;
  users: { nombre: string } | null;
}

interface GenerateTicketLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventZoneId: string
  boxId?: string // ID del box específico, si aplica
  zoneName: string
  zoneCapacity: number
  promoters: Promoter[]
  onLinkGenerated: () => void
  isBox?: boolean
}

export function GenerateTicketLinkDialog({
  open,
  onOpenChange,
  eventZoneId,
  boxId,
  zoneName,
  zoneCapacity,
  promoters,
  onLinkGenerated,
  isBox = false,
}: GenerateTicketLinkDialogProps) {
  const [limit, setLimit] = useState(isBox ? zoneCapacity : 100)
  const [promoterId, setPromoterId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [generatedLink, setGeneratedLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleGenerateLink = async () => {
    setError('')
    if (!promoterId) {
      setError('Debes seleccionar un promotor.')
      return
    }
    if (limit > zoneCapacity) {
      setError(`El límite no puede ser mayor que la capacidad (${zoneCapacity}).`)
      return
    }

    setLoading(true)
    try {
      const slug = Math.random().toString(36).substring(2, 12)
      const insertData: any = {
        promoter_id: promoterId,
        event_zone_id: eventZoneId,
        slug: slug,
        limite_generacion: limit,
        box_id: boxId, // Añadimos el box_id aquí
      }
      const { data, error } = await supabase
        .from('promoter_links')
        .insert(insertData)
        .select()
        .single()

      if (error) throw error

      const link = `${window.location.origin}/invite/${data.slug}`
      setGeneratedLink(link)
      onLinkGenerated()
    } catch (err) {
      console.error('Error generating link:', err)
      setError('Ocurrió un error al generar el link.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when dialog is closed
      setTimeout(() => {
        setPromoterId(null)
        setGeneratedLink('')
        setCopied(false)
        setError('')
        setLimit(isBox ? zoneCapacity : 100)
      }, 200) // Delay to allow for closing animation
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generar Link para "{zoneName}"</DialogTitle>
          <DialogDescription>
            Crea un link para compartir y registrar entradas.
          </DialogDescription>
        </DialogHeader>
        {!generatedLink ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="promoter">Promotor *</Label>
              <Select value={promoterId || ''} onValueChange={setPromoterId} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un promotor" />
                </SelectTrigger>
                <SelectContent>
                  {promoters.map((promoter) => (
                    <SelectItem key={promoter.id} value={promoter.id}>
                      {promoter.users?.nombre || 'Sin nombre'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isBox && (
              <div className="space-y-2">
                <Label htmlFor="limit">Límite de entradas</Label>
                <Input
                  id="limit"
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(Math.min(parseInt(e.target.value, 10) || 0, zoneCapacity))}
                  min={1}
                  max={zoneCapacity}
                />
                <p className="text-sm text-muted-foreground">
                  Capacidad máxima de la zona: {zoneCapacity}
                </p>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={handleGenerateLink} disabled={loading} className="w-full">
              {loading ? 'Generando...' : 'Generar Link'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p>Link generado:</p>
            <div className="flex items-center gap-2">
              <Input value={generatedLink} readOnly />
              <Button onClick={handleCopy} size="icon" variant="outline">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Cerrar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
