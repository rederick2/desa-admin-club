import { SidebarNav } from '@/components/sidebar-nav'
import { ClubAppBar } from '@/components/club-app-bar'
import type { ReactNode } from 'react'

type LayoutProps = {
  children: ReactNode
  params: Promise<{ clubId: string }>
}

export default async function ClubDashboardLayout({
  children,
  params,
}: LayoutProps) {
  const { clubId } = await params
  return (
    <div className="md:pl-64">
      <ClubAppBar clubId={clubId} />
      <SidebarNav clubId={clubId} />
      {/* El padding-left (md:pl-64) en el div principal compensa el ancho del sidebar en desktop */}
      {children}
    </div>
  )
}
