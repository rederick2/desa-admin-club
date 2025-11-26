'use client'

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { QRCodeSVG } from 'qrcode.react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar, MapPin, Ticket as TicketIcon, User } from 'lucide-react'
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel"



export function TicketDetailDialog({
    open,
    onOpenChange,
    tickets,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    tickets: {
        id: string
        codigo: string
        qr_data: string
        usado?: boolean
        event_zones: {
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
    }[]
}) {
    if (!tickets || tickets.length === 0) return null

    const firstTicket = tickets[0]
    const eventName = firstTicket.event_zones?.events?.nombre || 'Evento'
    const clubName = firstTicket.event_zones?.events?.clubs?.nombre || 'Club'
    const zoneName = firstTicket.event_zones?.club_zones?.nombre || 'Zona'
    const eventDate = firstTicket.event_zones?.events?.fecha_inicio
        ? new Date(firstTicket.event_zones.events.fecha_inicio)
        : new Date()

    const formattedDate = format(eventDate, "EEEE d 'de' MMMM, yyyy", { locale: es })
    const formattedTime = format(eventDate, 'HH:mm', { locale: es })

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-center text-2xl">Tus Entradas</DialogTitle>
                </DialogHeader>

                <Carousel className="w-full max-w-xs mx-auto">
                    <CarouselContent>
                        {tickets.map((ticket) => (
                            <CarouselItem key={ticket.id}>
                                <div className="space-y-6">
                                    {/* QR Code */}
                                    <div className="flex justify-center p-6 bg-white rounded-lg">
                                        <QRCodeSVG
                                            value={ticket.qr_data}
                                            size={200}
                                            level="H"
                                            includeMargin={true}
                                        />
                                    </div>

                                    {/* Ticket Code */}
                                    <div className="text-center">
                                        <p className="text-sm text-muted-foreground mb-1">Código de entrada</p>
                                        <p className="text-xl font-mono font-bold">{ticket.codigo.substring(0, 11)}</p>
                                    </div>

                                    {/* Event Details */}
                                    <div className="space-y-3 pt-4 border-t">
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

                                    {/* Status Badge */}
                                    {ticket.usado !== undefined && (
                                        <div className="flex justify-center pt-4 border-t">
                                            <Badge
                                                variant={ticket.usado ? 'secondary' : 'default'}
                                                className="text-sm px-4 py-1"
                                            >
                                                {ticket.usado ? 'Entrada Utilizada' : 'Entrada Válida'}
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    {tickets.length > 1 && (
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
