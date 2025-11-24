'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Calendar, Users, BarChart3, Menu, X, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SidebarNavProps {
  clubId: string
}

export function SidebarNav({ clubId }: SidebarNavProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const navItems = [
    /*{ label: 'Dashboard', href: `/dashboard/${clubId}`, icon: Calendar },*/
    { label: 'Eventos', href: `/dashboard/${clubId}/events`, icon: Calendar },
    { label: 'Zonas', href: `/dashboard/${clubId}/zones`, icon: Layers },
    { label: 'Promotores', href: `/dashboard/${clubId}/promoters`, icon: Users },
    { label: 'Mapa', href: `/dashboard/${clubId}/map-editor`, icon: Layers },
    { label: 'Estadísticas', href: `/dashboard/${clubId}/stats`, icon: BarChart3 },
  ]

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="md:hidden fixed top-4 right-4 z-40"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </Button>

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 w-64 h-screen bg-card border-r border-border transition-transform md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-6">
          <h2 className="text-xl font-bold text-foreground mb-8"><a key='home' href='/dashboard'>Inicio</a></h2>
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    className="w-full justify-start gap-2"
                    onClick={() => setOpen(false)}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>

      <div className="hidden md:block fixed inset-0 pointer-events-none" />
    </>
  )
}
