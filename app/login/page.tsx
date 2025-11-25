'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { Mail, Lock } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      /*if (data.session.user.id) {
        router.push('/home')
      }*/
      // Comprobar el rol del usuario
      const { data: profile, error: profileError } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', data.session.user.id)
        .single();

      if (profile && profile.role_id === 1) {
        router.push('/dashboard'); // Redirigir al panel de administrador
      } else if (profile && profile.role_id === 2) {
        router.push('/promoter'); // Redirigir al panel de usuario  return;
      } else if (profile && profile.role_id === 3) {
        router.push('/home'); // Redirigir al panel de usuario  return;
      } else if (profileError) {
        console.error("Error fetching user role:", profileError.message);
      }
    } catch (err) {
      setError('Error al iniciar sesión')
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
              Bienvenido
            </h1>
            <p className="text-sm" style={{ color: '#b8b8b8' }}>
              Accede a tu cuenta para gestionar eventos y tickets
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
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
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: '#b8b8b8' }}>
              ¿No tienes cuenta?{' '}
              <Link
                href="/signup"
                className="hover:underline font-medium"
                style={{ color: '#a78bfa' }}
              >
                Regístrate
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
