import { AppSidebar } from '@/components/app-sidebar'
import { ClubAppBar } from '@/components/club-app-bar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
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
    <SidebarProvider>
      <AppSidebar clubId={clubId} />
      <SidebarInset>
        <ClubAppBar clubId={clubId} />
        <div className="flex-1 p-4 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
