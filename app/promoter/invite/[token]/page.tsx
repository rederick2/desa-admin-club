'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Loader } from 'lucide-react'

export default function PromotorInvitePage(
  { params }: { params: Promise<{ token: string }> }
) {
  // 👇 aquí desempaquetamos el Promise de params
  const { token } = use(params)

  const [step, setStep] = useState<'loading' | 'check' | 'register' | 'complete'>('loading')
  const [invitation, setInvitation] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const loadInvitation = async () => {
      try {
        // 👇 usamos el token ya resuelto
        const response = await fetch(`/api/promoters/invitation/${token}`)
        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Invalid or expired invitation')
          setStep('complete')
          return
        }

        setInvitation(data.invitation)
        setEmail(data.invitation.email)
        setStep('check')
      } catch (err) {
        setError('Error loading invitation')
        setStep('complete')
      }
    }

    if (token) {
      loadInvitation()
    }
  }, [token])

  const handleCheckUser = async () => {
    setLoading(true)
    setError('')

    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      if (existingUser) {
        // User exists, link as promoter
        await linkPromoter(existingUser.id)
      } else {
        // Need to create new user
        setStep('register')
      }
    } catch (err) {
      setStep('register')
    }

    setLoading(false)
  }

  const handleRegister = async () => {
    setLoading(true)
    setError('')

    try {
      // Sign up new user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      })

      if (signUpError) throw signUpError
      if (!authData.user) throw new Error('No user created')

      // Create user record
      const { error: userError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            nombre,
            email,
            telefono: telefono || null,
          },
        ])

      if (userError) throw userError

      // Link as promoter
      await linkPromoter(authData.user.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error during registration')
    }

    setLoading(false)
  }

  const linkPromoter = async (userId: string) => {
    try {
      const response = await fetch('/api/promoters/link-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,   // 👈 aquí también usamos el token resuelto
          userId,
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error)

      setStep('complete')
      setTimeout(() => {
        router.push('/promoter/dashboard')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error linking promoter')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader className="w-8 h-8 animate-spin mb-4" />
            <p className="text-slate-600">Cargando invitación...</p>
          </div>
        )}

        {step === 'check' && invitation && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">¡Bienvenido!</h1>
            <p className="text-slate-600">
              Has sido invitado a ser promotor en <strong>{invitation.club_name}</strong>
            </p>
            <p className="text-sm text-slate-500">
              Email: <span className="font-mono">{email}</span>
            </p>
            <Button onClick={handleCheckUser} disabled={loading} className="w-full">
              {loading ? 'Verificando...' : 'Continuar'}
            </Button>
          </div>
        )}

        {step === 'register' && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">Crear cuenta</h1>
            <div>
              <Label htmlFor="nombre">Nombre completo</Label>
              <Input
                id="nombre"
                type="text"
                placeholder="Tu nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="telefono">Teléfono (opcional)</Label>
              <Input
                id="telefono"
                type="tel"
                placeholder="+51 999 999 999"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Contraseña segura"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button onClick={handleRegister} disabled={loading || !nombre || !password} className="w-full">
              {loading ? 'Registrando...' : 'Registrar y continuar'}
            </Button>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-4 text-center">
            {error ? (
              <>
                <h1 className="text-2xl font-bold text-red-600">Error</h1>
                <p className="text-red-600">{error}</p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-green-600">¡Éxito!</h1>
                <p className="text-slate-600">
                  Ya eres promotor. Redirigiendo al dashboard...
                </p>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
