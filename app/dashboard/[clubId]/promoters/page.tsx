'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { AdminNav } from '@/components/admin-nav'
import { PromotersList } from '@/components/promoters-list'

interface Club {
  nombre: string
}

export default function PromotersPage() {
  const router = useRouter()
  const params = useParams()
  const clubId = params.clubId as string

  const [user, setUser] = useState<User | null>(null)
  const [club, setClub] = useState<Club | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push('/login')
        return
      }

      setUser(session.user)

      const { data: clubData } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', clubId)
        .eq('user_id', session.user.id)
        .single()

      if (!clubData) {
        router.push('/dashboard')
        return
      }

      setClub(clubData)
      setLoading(false)
    }

    checkAuth()
  }, [router, clubId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center ">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen ">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <PromotersList clubId={clubId} />
      </main>
    </div>
  )
}
