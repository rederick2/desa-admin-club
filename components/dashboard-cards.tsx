import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Users, Ticket } from 'lucide-react'

interface DashboardCardsProps {
  activeEvents?: number
  estimatedCapacity?: number
  codesGenerated?: number
}

export function DashboardCards({
  activeEvents = 0,
  estimatedCapacity = 0,
  codesGenerated = 0,
}: DashboardCardsProps) {
  const cards = [
    {
      title: 'Eventos activos',
      value: activeEvents,
      icon: BarChart3,
      color: 'text-blue-500',
    },
    {
      title: 'Aforo estimado hoy',
      value: estimatedCapacity,
      icon: Users,
      color: 'text-green-500',
    },
    {
      title: 'Códigos generados hoy',
      value: codesGenerated,
      icon: Ticket,
      color: 'text-purple-500',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
