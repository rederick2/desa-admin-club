'use client'

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar, MapPin, Copy, Check, Link as LinkIcon, User, Ticket as TicketIcon } from 'lucide-react'
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel"
import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

interface Ticket {
    id: string
    codigo: string
    created_at: string
    users: {
        nombre: string | null
        email: string | null
    } | null
}

interface PromoterLink {
    id: string
    slug: string
    limite_generacion: number | null
    usados: number | null
    link_url: string | null
    event_zones: {
        id: string
        club_zones: {
            nombre: string
        } | null
        events: {
            nombre: string
            fecha_inicio: string
            clubs: {
                nombre: string
            } | null
        } | null
    } | null
    boxes: {
        numero: number
    } | null
    tickets?: Ticket[]
}

interface PromoterLinkDetailDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    links: PromoterLink[]
}

export function PromoterLinkDetailDialog({
    open,
    onOpenChange,
    links,
}: PromoterLinkDetailDialogProps) {
    const [copiedLink, setCopiedLink] = useState<string | null>(null)

    if (!links || links.length === 0) return null

    const handleCopy = (slug: string) => {
        const linkUrl = `${window.location.origin}/invite/${slug}`
        navigator.clipboard.writeText(linkUrl)
        setCopiedLink(slug)
        setTimeout(() => setCopiedLink(null), 2000)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-center text-2xl">Tus Enlaces</DialogTitle>
                </DialogHeader>

                <Carousel className="w-full max-w-xs mx-auto">
                    <CarouselContent>
                        {links.map((link) => {
                            const eventName = link.event_zones?.events?.nombre || 'Evento'
                            const clubName = link.event_zones?.events?.clubs?.nombre || 'Club'
                            const zoneName = link.boxes
                                ? `Box ${link.boxes.numero}`
                                : link.event_zones?.club_zones?.nombre || 'General'

                            const eventDate = link.event_zones?.events?.fecha_inicio
                                ? new Date(link.event_zones.events.fecha_inicio)
                                : new Date()

                            const formattedDate = format(eventDate, "EEEE d 'de' MMMM, yyyy", { locale: es })
                            const formattedTime = format(eventDate, 'HH:mm', { locale: es })

                            const remaining = (link.limite_generacion ?? 0) - (link.usados ?? 0)
                            const isUnlimited = link.limite_generacion === null

                            return (
                                <CarouselItem key={link.id}>
                                    <div className="space-y-6">
                                        {/* Event Details */}
                                        <div className="space-y-3 pt-2">
                                            <div className="flex items-start gap-3">
                                                <TicketIcon className="w-5 h-5 text-muted-foreground mt-0.5" />
                                                <div>
                                                    <p className="font-semibold">{eventName}</p>
                                                    <p className="text-sm text-muted-foreground">{zoneName}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3">
                                                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                                                <div>
                                                    <p className="font-semibold capitalize">{formattedDate}</p>
                                                    <p className="text-sm text-muted-foreground">{formattedTime} hs</p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3">
                                                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                                                <div>
                                                    <p className="font-semibold">{clubName}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Link Copy Section */}
                                        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                                            <p className="text-sm font-medium text-center mb-2">Enlace de Venta</p>
                                            <div className="flex items-center gap-2">
                                                <code className="flex-1 p-2 bg-background rounded text-xs truncate">
                                                    {`${window.location.origin}/invite/${link.slug}`}
                                                </code>
                                                <Button
                                                    size="icon"
                                                    variant="outline"
                                                    className="h-8 w-8 shrink-0"
                                                    onClick={() => handleCopy(link.slug)}
                                                >
                                                    {copiedLink === link.slug ? (
                                                        <Check className="h-4 w-4 text-green-500" />
                                                    ) : (
                                                        <Copy className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Usage Stats */}
                                        <div className="grid grid-cols-3 gap-2 text-center border-t border-b py-4">
                                            <div>
                                                <p className="text-xs text-muted-foreground">Usados</p>
                                                <p className="font-bold text-lg">{link.usados ?? 0}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Límite</p>
                                                <p className="font-bold text-lg">{isUnlimited ? '∞' : link.limite_generacion}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Disponibles</p>
                                                <p className="font-bold text-lg text-primary">
                                                    {isUnlimited ? '∞' : Math.max(0, remaining)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Generated Tickets List */}
                                        <div className="space-y-3">
                                            <h4 className="font-semibold text-sm flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                Tickets Generados
                                            </h4>
                                            <ScrollArea className="h-[200px] w-full rounded-md">
                                                {link.tickets && link.tickets.length > 0 ? (
                                                    <div className="space-y-1">
                                                        {link.tickets.map((ticket) => (
                                                            <div key={ticket.id} className="flex items-center justify-between p-2 bg-card rounded border-0 text-sm">
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium">{ticket.users?.nombre || 'Usuario Desconocido'}</span>
                                                                    <span className="text-xs text-muted-foreground">{ticket.codigo}</span>
                                                                </div>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {format(new Date(ticket.created_at), 'dd/MM HH:mm')}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                                                        <p>No se han generado tickets aún.</p>
                                                    </div>
                                                )}
                                            </ScrollArea>
                                        </div>
                                    </div>
                                </CarouselItem>
                            )
                        })}
                    </CarouselContent>
                    {links.length > 1 && (
                        <>
                            <CarouselPrevious />
                            <CarouselNext />
                        </>
                    )}
                </Carousel>
            </DialogContent>
        </Dialog>
    )
}
