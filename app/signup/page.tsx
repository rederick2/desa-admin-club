'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signupError) {
        setError(signupError.message)
        setLoading(false)
        return
      }

      if (authData.user) {
        const { error: insertError } = await supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              email,
              nombre,
              telefono,
            },
          ])

        if (insertError) {
          console.error('Error creating user record:', insertError)
          setError('Error al guardar el perfil')
          setLoading(false)
          return
        }

        setSuccess('Cuenta creada exitosamente. Redirigiendo...')
        setTimeout(() => {
          router.push('/login')
        }, 1500)
      }
    } catch (err) {
      setError('Error al crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Card className="p-8 border border-border">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Crear Cuenta
            </h1>
            <p className="text-muted-foreground text-sm">
              Regístrate para gestionar tus eventos y entradas
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-600 dark:text-green-400 text-sm">{success}</p>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Nombre completo
              </label>
              <Input
                type="text"
                placeholder="Juan Pérez"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <Input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Teléfono
              </label>
              <Input
                type="tel"
                placeholder="+34 600 000 000"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Contraseña
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Confirmar contraseña
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{' '}
              <Link
                href="/login"
                className="text-primary hover:underline font-medium"
              >
                Inicia sesión
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
