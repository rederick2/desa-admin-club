'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, usePathname } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { User, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

interface ClubAppBarProps {
  clubId: string
}

export function ClubAppBar({ clubId }: ClubAppBarProps) {
  const router = useRouter()
  const [clubData, setClubData] = useState<any>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserEmail(user.email || '')
        }

        // Get club data
        const { data: club } = await supabase
          .from('clubs')
          .select('id, nombre, logo_url')
          .eq('id', clubId)
          .single()

        if (club) {
          setClubData(club)
        }
      } catch (error) {
        console.error('Error fetching club data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [clubId, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="h-16 bg-card border-b border-border animate-pulse" />
    )
  }

  return (
    <div className="h-16 bg-card border-b border-border flex items-center justify-between px-4 gap-4">
      {/* Left section: Sidebar Trigger, Back button and club info */}
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />

        <Link href={`/dashboard/${clubId}`}>
          <Button variant="ghost" size="sm" className="gap-2 hidden md:flex">
            <ChevronLeft className="w-4 h-4" />
            Volver
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Link>

        <div className="flex items-center gap-3 border-l border-border pl-4">
          {clubData?.logo_url && (
            <img
              src={clubData.logo_url || "/placeholder.svg"}
              alt={clubData.nombre}
              className="w-8 h-8 rounded object-cover"
            />
          )}
          <div>
            <h1 className="text-lg font-semibold text-foreground truncate max-w-[150px] md:max-w-none">
              {clubData?.nombre || 'Club'}
            </h1>
          </div>
        </div>
      </div>

      {/* Right section: User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <User className="w-4 h-4" />
            <span className="hidden md:inline">{userEmail}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(`/dashboard/${clubId}/profile`)}>
            Mi perfil
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout}>
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
