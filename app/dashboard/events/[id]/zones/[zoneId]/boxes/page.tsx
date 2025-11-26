'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { AdminNav } from '@/components/admin-nav'
import { BoxesList } from '@/components/boxes-list'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function BoxesPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params?.id as string
  const zoneId = params?.zoneId as string
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [zone, setZone] = useState<any>(null)

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
      await loadZone()
      setLoading(false)
    }

    checkAuth()
  }, [router, zoneId])

  const loadZone = async () => {
    try {
      const { data, error } = await supabase
        .from('event_zones')
        .select('*')
        .eq('id', zoneId)
        .single()

      if (error) throw error
      setZone(data)
    } catch (error) {
      console.error('Error loading zone:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center ">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen ">
      <AdminNav clubName="Gestión de Boxes" userEmail={user?.email} />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Button>

        {zone && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Boxes - {zone.nombre}</h2>
              <p className="text-muted-foreground">
                Gestiona los boxes de esta zona
              </p>
            </div>
            <BoxesList zoneId={zoneId} zoneName={zone.nombre} />
          </div>
        )}
      </main>
    </div>
  )
}
