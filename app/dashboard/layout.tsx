import { SidebarNav } from '@/components/sidebar-nav'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen bg-background">
      {children}
    </div>
  )
}
