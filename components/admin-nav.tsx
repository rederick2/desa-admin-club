'use client'

import { useRouter, useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { User, Home, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

interface AdminNavProps {
  clubName?: string
  userEmail?: string
}

export function AdminNav({ clubName = 'Club Manager', userEmail }: AdminNavProps) {
  const router = useRouter()
  const params = useParams()
  const clubId = params.clubId as string

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ChevronLeft className="w-4 h-4" />
              Volver
            </Button>
          </Link>
          <div className="border-l border-border pl-4">
            <h3 className="text-lg font-semibold text-foreground">{clubName}</h3>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <User className="w-4 h-4" />
              {userEmail}
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
    </nav>
  )
}
