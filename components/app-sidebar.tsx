'use client'

import {
  Calendar,
  Users,
  BarChart3,
  Layers,
  Map,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  clubId: string
}

export function AppSidebar({ clubId, ...props }: AppSidebarProps) {
  const pathname = usePathname()

  const navItems = [
    { label: 'Eventos', href: `/dashboard/${clubId}/events`, icon: Calendar },
    { label: 'Zonas', href: `/dashboard/${clubId}/zones`, icon: Layers },
    { label: 'Promotores', href: `/dashboard/${clubId}/promoters`, icon: Users },
    { label: 'Mapa', href: `/dashboard/${clubId}/map-editor`, icon: Map },
    { label: 'Estadísticas', href: `/dashboard/${clubId}/stats`, icon: BarChart3 },
  ]

  return (
    <Sidebar {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <Link href="/dashboard" className="hover:underline">Inicio</Link>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
