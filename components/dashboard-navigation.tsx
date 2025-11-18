'use client'

import { Button } from '@/components/ui/button'
import { useRouter, useParams } from 'next/navigation'
import { Plus } from 'lucide-react'

export function DashboardNavigation({ clubId }: { clubId: string }) {
  const router = useRouter()

  const actions = [
    {
      label: 'Crear evento',
      onClick: () => router.push(`/dashboard/${clubId}/events/create`),
      variant: 'default' as const,
      icon: true,
    },
    {
      label: 'Ver eventos',
      onClick: () => router.push(`/dashboard/${clubId}/events`),
      variant: 'outline' as const,
    },
    {
      label: 'Ver promotores',
      onClick: () => router.push(`/dashboard/${clubId}/promoters`),
      variant: 'outline' as const,
    },
  ]

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {actions.map((action) => (
        <Button
          key={action.label}
          onClick={action.onClick}
          variant={action.variant}
          className={action.variant === 'default' ? 'gap-2' : ''}
        >
          {action.variant === 'default' && <Plus className="w-4 h-4" />}
          {action.label}
        </Button>
      ))}
    </div>
  )
}
