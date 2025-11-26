import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface TicketCardProps {
  eventImage?: string
  eventName: string
  eventLocation: string
  eventDate: string | Date
  ticketCount: number
  onClick?: () => void
}

export function TicketCard({
  eventImage = "/placeholder.svg?height=100&width=100",
  eventName,
  eventLocation,
  eventDate,
  ticketCount,
  onClick,
}: TicketCardProps) {
  const dateObj = typeof eventDate === "string" ? new Date(eventDate) : eventDate

  // Format date like "sábado 22 17:00hs"
  const formattedDate = format(dateObj, "EEEE d HH:mm'hs'", { locale: es })

  return (
    <Card
      className="overflow-hidden border-1 border-white/10 bg-card/50 hover:bg-card/80 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-0 flex items-center gap-4 ml-2">
        <div className="relative h-24 w-24 flex-shrink-0">
          <Image
            src={eventImage}
            alt={eventName}
            fill
            className="object-cover rounded-md"
          />
        </div>
        <div className="flex flex-col gap-1 py-2 pr-4 min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="text-primary font-medium">{ticketCount} entradas</span>
            <span>•</span>
            <span className="capitalize">{formattedDate}</span>
          </div>
          <h3 className="font-bold text-lg leading-tight truncate">{eventName}</h3>
          <p className="text-sm text-muted-foreground truncate">{eventLocation}</p>
        </div>
      </CardContent>
    </Card>
  )
}
