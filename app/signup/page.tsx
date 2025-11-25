'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { Mail, Lock, User, Phone } from 'lucide-react'

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
    <div
      className="flex items-center justify-center px-4"
      style={{
        background: 'linear-gradient(135deg, #1a0b2e 0%, #2d1b4e 50%, #4a2c6d 100%)',
        minHeight: '100vh'
      }}
    >
      <div className="w-full max-w-md">
        <Card
          className="p-8"
          style={{
            background: 'rgba(20, 10, 40, 0.6)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}
        >
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#ffffff' }}>
              Crear Cuenta
            </h1>
            <p className="text-sm" style={{ color: '#b8b8b8' }}>
              Regístrate para gestionar tus eventos y entradas
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
              <p className="text-sm" style={{ color: '#4ade80' }}>{success}</p>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#e5e5e5' }}>
                Nombre completo
              </label>
              <div className="auth-input-wrapper">
                <User className="auth-input-icon" size={18} style={{ color: '#888' }} />
                <Input
                  type="text"
                  placeholder="Juan Pérez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  disabled={loading}
                  required
                  style={{
                    paddingLeft: '40px',
                    background: 'rgba(30, 20, 50, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    borderRadius: '8px'
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#e5e5e5' }}>
                Email
              </label>
              <div className="auth-input-wrapper">
                <Mail className="auth-input-icon" size={18} style={{ color: '#888' }} />
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  style={{
                    paddingLeft: '40px',
                    background: 'rgba(30, 20, 50, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    borderRadius: '8px'
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#e5e5e5' }}>
                Teléfono
              </label>
              <div className="auth-input-wrapper">
                <Phone className="auth-input-icon" size={18} style={{ color: '#888' }} />
                <Input
                  type="tel"
                  placeholder="+34 600 000 000"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  disabled={loading}
                  style={{
                    paddingLeft: '40px',
                    background: 'rgba(30, 20, 50, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    borderRadius: '8px'
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#e5e5e5' }}>
                Contraseña
              </label>
              <div className="auth-input-wrapper">
                <Lock className="auth-input-icon" size={18} style={{ color: '#888' }} />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  style={{
                    paddingLeft: '40px',
                    background: 'rgba(30, 20, 50, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    borderRadius: '8px'
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#e5e5e5' }}>
                Confirmar contraseña
              </label>
              <div className="auth-input-wrapper">
                <Lock className="auth-input-icon" size={18} style={{ color: '#888' }} />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                  style={{
                    paddingLeft: '40px',
                    background: 'rgba(30, 20, 50, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    borderRadius: '8px'
                  }}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
                color: '#ffffff',
                borderRadius: '25px',
                padding: '12px 24px',
                fontWeight: '500',
                border: 'none',
                marginTop: '1.5rem'
              }}
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: '#b8b8b8' }}>
              ¿Ya tienes cuenta?{' '}
              <Link
                href="/login"
                className="hover:underline font-medium"
                style={{ color: '#a78bfa' }}
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
