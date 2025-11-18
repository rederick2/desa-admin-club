'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'

export default function CreateClubPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
  })

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
      setLoading(false)
    }

    checkAuth()
  }, [router])

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !formData.nombre.trim()) {
      return
    }

    setCreating(true)

    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          nombre: formData.nombre.split(' ')[0], // Use first word as default name
        }, { onConflict: 'id' })
        .select()
        .single()

      if (userError) throw userError

      const { data, error } = await supabase
        .from('clubs')
        .insert({
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          user_id: user.id,
        })
        .select()
        .single()

      if (error) throw error

      router.push(`/dashboard/${data.id}`)
    } catch (error) {
      console.error('Error creating club:', error)
      alert('Error al crear el club. Intenta nuevamente.')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-md mx-auto">
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-6">
            ← Volver
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Crear nuevo club</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateClub} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nombre del club
                </label>
                <Input
                  placeholder="Ej: Club Premium"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Descripción
                </label>
                <Textarea
                  placeholder="Describe tu club"
                  value={formData.descripcion}
                  onChange={(e) =>
                    setFormData({ ...formData, descripcion: e.target.value })
                  }
                  rows={4}
                />
              </div>

              <Button
                type="submit"
                disabled={creating}
                className="w-full"
              >
                {creating ? 'Creando...' : 'Crear club'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
