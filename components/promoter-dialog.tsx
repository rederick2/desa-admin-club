'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Copy, Check } from 'lucide-react'

interface PromoterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clubId: string
  promoter?: {
    id: string
    user_id?: string
    porcentaje_comision?: number
    activo?: boolean
  } | null
  onSave: () => void
}

export function PromoterDialog({
  open,
  onOpenChange,
  clubId,
  promoter,
  onSave,
}: PromoterDialogProps) {
  const [loading, setLoading] = useState(false)
  const [invitationUrl, setInvitationUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    porcentaje_comision: 0,
  })

  useEffect(() => {
    if (open && !promoter) {
      setFormData({
        email: '',
        porcentaje_comision: 0,
      })
      setInvitationUrl('')
      setCopied(false)
    }
  }, [promoter, open])

  const handleGenerateInvitation = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/promoters/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId,
          email: formData.email,
          porcentaje_comision: formData.porcentaje_comision,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error generating invitation')
      }

      setInvitationUrl(data.invitationUrl)
    } catch (error) {
      console.error('[v0] Error:', error)
      alert(error instanceof Error ? error.message : 'Error al generar invitación')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(invitationUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('[v0] Error copying:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar promotor</DialogTitle>
        </DialogHeader>

        {!invitationUrl ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email del promotor</Label>
              <Input
                id="email"
                type="email"
                placeholder="promotor@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="porcentaje">Porcentaje de comisión (%)</Label>
              <Input
                id="porcentaje"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.porcentaje_comision}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    porcentaje_comision: parseFloat(e.target.value) || 0,
                  })
                }
                disabled={loading}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Link de invitación generado. Comparte este link con el promotor:
            </p>
            <div className="bg-slate-50 p-3 rounded border border-slate-200 break-all">
              <p className="text-sm font-mono text-slate-700">{invitationUrl}</p>
            </div>
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar link
                </>
              )}
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setInvitationUrl('')
              onOpenChange(false)
            }}
            disabled={loading}
          >
            {invitationUrl ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!invitationUrl && (
            <Button
              type="button"
              onClick={handleGenerateInvitation}
              disabled={loading || !formData.email}
            >
              {loading ? 'Generando...' : 'Generar link'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
