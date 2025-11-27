'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'
import { Calendar, IdCard, Mail, Phone, User as UserIcon, Lock } from 'lucide-react'
import Image from "next/image"

const maxFecha = new Date()
maxFecha.setFullYear(maxFecha.getFullYear() - 18)
const maxDateStr = maxFecha.toISOString().split('T')[0] // YYYY-MM-DD

interface EventZone {
  id: string
  event_id: string
  club_zones: {
    nombre: string
    es_zona_boxes: boolean
  } | null
  events: {
    nombre: string
    fecha_inicio: string
    banner_url: string
    clubs: {
      nombre: string
    } | null
  } | null
}

// --- Helpers ---

function capitalizar(texto: string) {
  if (!texto) return ''
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function formatFechaCompleta(fecha: string) {
  if (!fecha) return ''
  const date = new Date(fecha)

  const opcionesDia = { weekday: 'long' } as const
  const opcionesFecha = { day: 'numeric', month: 'long' } as const

  const dia = date.toLocaleDateString('es-PE', opcionesDia)
  const fechaTexto = date.toLocaleDateString('es-PE', opcionesFecha)

  // Usamos la hora "UTC" para evitar corrimiento
  let horas = date.getHours()
  const minutos = date.getMinutes().toString().padStart(2, '0')

  const ampm = horas >= 12 ? 'pm' : 'am'
  horas = horas % 12
  if (horas === 0) horas = 12

  return `${capitalizar(dia)} ${fechaTexto} a las ${horas}:${minutos} ${ampm}`
}

function generarCodigoTicket() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return 'TK-' + crypto.randomUUID().replace(/-/g, '').toUpperCase()
  }

  const rand = Math.random().toString(36).substring(2)
  const time = Date.now().toString(36)
  return 'TK-' + (rand + time).toUpperCase()
}

async function createTicketForUser(opts: {
  supabase: any
  user: User
  eventZoneId: string
  promoterId?: string | null
  promoterLinkId?: string | null
}) {
  const { supabase, user, eventZoneId, promoterId, promoterLinkId } = opts

  const codigo = generarCodigoTicket()
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
  const linkAcceso = `${baseUrl}/ticket/${codigo}`

  const { error } = await supabase.from('tickets').insert({
    event_zone_id: eventZoneId,
    user_id: user.id,
    promoter_id: promoterId ?? null,
    promoter_link_id: promoterLinkId ?? null,
    codigo,
    qr_data: linkAcceso,
    link_acceso: linkAcceso
  })

  if (error) throw error
}

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params?.token as string

  const [loading, setLoading] = useState(true)
  const [linkData, setLinkData] = useState<any>(null)
  const [zoneData, setZoneData] = useState<EventZone | null>(null)

  const [user, setUser] = useState<User | null>(null)

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    numero_documento: '',
    fecha_nacimiento: '',
    password: ''
  })

  const [submitting, setSubmitting] = useState(false)

  // dialogs
  const [signupOpen, setSignupOpen] = useState(false)
  const [signupOpen2, setSignupOpen2] = useState(false)

  const [signupPassword, setSignupPassword] = useState('')
  const [signupPassword2, setSignupPassword2] = useState('')
  const [signupLoading, setSignupLoading] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const load = async () => {
      await loadLinkData()
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        setUser(data.user)
        setFormData(prev => ({
          ...prev,
          nombre: (data.user.user_metadata as any)?.nombre || prev.nombre,
          email: data.user.email || prev.email
        }))
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const loadLinkData = async () => {
    try {
      const { data: link, error: linkError } = await supabase
        .from('promoter_links')
        .select('*')
        .eq('slug', token)
        .single()

      if (linkError || !link) {
        setLinkData(null)
        setLoading(false)
        return
      }

      setLinkData(link)

      const { data: zone, error: zoneError } = await supabase
        .from('event_zones')
        .select(
          `
          id,
          event_id,
          club_zones ( nombre ),
          events (
            nombre,
            banner_url,
            fecha_inicio,
            clubs ( nombre )
          )
        `
        )
        .eq('id', link.event_zone_id)
        .single()

      if (!zoneError && zone) {
        setZoneData(zone as EventZone)
      }
    } catch (error) {
      console.error('Error loading link data:', error)
    } finally {
      setLoading(false)
    }
  }

  const remainingQuota = linkData
    ? Math.max(0, (linkData.limite_generacion ?? 0) - (linkData.usados ?? 0))
    : 0
  const isQuotaFull = remainingQuota === 0

  // Cuando hace click en "Registrar entrada"
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!linkData || !zoneData) {
      toast.error('Link inválido')
      return
    }
    if (isQuotaFull) {
      toast.error('Los cupos para este link se han agotado')
      return
    }

    setSubmitting(true)
    try {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        // 👇 Si no hay usuario, mostramos el diálogo de crear cuenta (con opción de login)
        setSignupOpen(true)
        setSubmitting(false)
        return
      }

      await createTicketForUser({
        supabase,
        user: data.user,
        eventZoneId: zoneData.id,
        promoterId: linkData.promoter_id,
        promoterLinkId: linkData.id
      })

      await supabase
        .from('promoter_links')
        .update({ usados: (linkData.usados ?? 0) + 1 })
        .eq('id', linkData.id)

      toast.success('Entrada registrada exitosamente')
      router.push('/') // o a donde quieras
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al registrar la entrada')
    } finally {
      setSubmitting(false)
    }
  }

  // Crear cuenta + crear ticket
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!linkData || !zoneData) {
      toast.error('Error interno: faltan datos del evento')
      return
    }

    if (!formData.nombre || !formData.email || !formData.telefono) {
      toast.error('Completa todos los campos para continuar')
      return
    }
    if (!signupPassword || !signupPassword2) {
      toast.error('Ingresa una contraseña')
      return
    }
    if (signupPassword !== signupPassword2) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    setSignupLoading(true)
    try {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: formData.email,
        password: signupPassword,
        options: {
          data: {
            nombre: formData.nombre
          }
        }
      })

      if (error) {
        console.error(error)
        toast.error(error.message)
        setSignupLoading(false)
        return
      }

      if (signUpData.user) {
        const { error: insertError } = await supabase.from('users').insert([
          {
            id: signUpData.user.id,
            email: formData.email,
            nombre: formData.nombre,
            telefono: formData.telefono,
            numero_documento: formData.numero_documento,
            fecha_nacimiento: formData.fecha_nacimiento
          }
        ])

        if (insertError) {
          console.error('Error creating user record:', insertError)
          toast.error('Error al guardar el perfil')
          setSignupLoading(false)
          return
        }

        const { error: insertError2 } = await supabase.from('user_roles').insert([
          {
            user_id: signUpData.user.id,
            role_id: 3
          }
        ])

        if (insertError2) {
          console.error('Error creating user role:', insertError2)
          toast.error('Error al guardar el rol')
          setSignupLoading(false)
          return
        }
      }

      const newUser = signUpData.user ?? signUpData.session?.user

      if (!newUser) {
        toast.message(
          'Te enviamos un correo de confirmación. Confirma tu cuenta y luego vuelve a este enlace.'
        )
        setSignupLoading(false)
        return
      }

      setUser(newUser)

      await createTicketForUser({
        supabase,
        user: newUser,
        eventZoneId: zoneData.id,
        promoterId: linkData.promoter_id,
        promoterLinkId: linkData.id
      })

      await supabase
        .from('promoter_links')
        .update({ usados: (linkData.usados ?? 0) + 1 })
        .eq('id', linkData.id)

      toast.success('Cuenta creada y entrada registrada')
      setSignupOpen(false)
      router.push('/')
    } catch (error) {
      console.error(error)
      toast.error('Error al crear la cuenta o el ticket')
    } finally {
      setSignupLoading(false)
    }
  }

  // Iniciar sesión + crear ticket
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!linkData || !zoneData) {
      toast.error('Error interno: faltan datos del evento')
      return
    }

    if (!formData.email || !formData.password) {
      toast.error('Ingresa email y contraseña')
      return
    }

    setLoginLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      })

      if (error) {
        toast.error(error.message)
        setLoginLoading(false)
        return
      }

      if (!data.user) {
        toast.error('No se encontró el usuario')
        setLoginLoading(false)
        return
      }

      await createTicketForUser({
        supabase,
        user: data.user,
        eventZoneId: zoneData.id,
        promoterId: linkData.promoter_id,
        promoterLinkId: linkData.id
      })

      await supabase
        .from('promoter_links')
        .update({ usados: (linkData.usados ?? 0) + 1 })
        .eq('id', linkData.id)

      toast.success('Entrada registrada exitosamente')
      setSignupOpen2(false)
      router.push('/')
    } catch (err) {
      console.error(err)
      toast.error('Error al iniciar sesión o registrar la entrada')
    } finally {
      setLoginLoading(false)
    }
  }

  // --- Renders de estado ---

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #1a0b2e 0%, #2d1b4e 50%, #4a2c6d 100%)',
          minHeight: '100vh'
        }}>
        <p>Cargando...</p>
      </div>
    )
  }

  if (!linkData || !zoneData) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{
        background: 'linear-gradient(135deg, #1a0b2e 0%, #2d1b4e 50%, #4a2c6d 100%)',
        minHeight: '100vh'
      }}>
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground mb-4">
              Link inválido o expirado
            </p>
            <Button onClick={() => router.push('/')} className="w-full">
              Volver a inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // --- Render principal ---

  return (
    <>
      <div className="min-h-screen from-primary/10 to-primary/5 flex items-center justify-center px-4 py-8"
        style={{
          background: 'linear-gradient(135deg, #1a0b2e 0%, #2d1b4e 50%, #4a2c6d 100%)',
          minHeight: '100vh'
        }}>
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-center">
              {zoneData?.events?.clubs?.nombre || 'Evento'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Info del evento */}
            <div className="relative h-24 w-full flex-shrink-0">
              <Image
                src={zoneData?.events?.banner_url || '/placeholder.svg?height=100&width=400'}
                alt={zoneData?.events?.nombre || 'Evento'}
                fill
                className="object-cover rounded-md"
              />
            </div>
            <div className="space-y-2 p-4 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Evento</p>
                <p className="font-medium">{zoneData?.events?.nombre}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Zona</p>
                <p className="font-medium">{zoneData?.club_zones?.nombre}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inicio</p>
                <p className="font-medium">
                  {formatFechaCompleta(zoneData?.events?.fecha_inicio ?? '')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cupos disponibles</p>
                <p className="text-lg font-bold">{remainingQuota}</p>
              </div>
            </div>

            {/* Botón para registrar entrada */}
            {!isQuotaFull ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Registrando...' : 'Registrar entrada'}
                </Button>
              </form>
            ) : (
              <div className="text-center p-4 bg-destructive/10 rounded-lg">
                <p className="text-destructive font-medium">
                  Los cupos para este link se han agotado
                </p>
              </div>
            )}

            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="w-full"
            >
              Volver
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de registro de cuenta */}
      <Dialog open={signupOpen} onOpenChange={setSignupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear cuenta</DialogTitle>
            <DialogDescription>
              Crea tu cuenta para guardar tu entrada en tu perfil.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSignupSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#e5e5e5' }}>
                Nombre completo
              </label>
              <div className="flex items-center rounded-md border border-white/10">
                <span className="pl-3 text-gray-400" style={{ paddingRight: '10px' }}>
                  <UserIcon size={18} />
                </span>
                <Input
                  type="text"
                  placeholder="Juan Pérez"
                  value={formData.nombre}
                  onChange={e =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  disabled={signupLoading}
                  required
                  style={{
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
              <div className="flex items-center rounded-md border border-white/10">
                <span className="pl-3 text-gray-400" style={{ paddingRight: '10px' }}>
                  <Mail size={18} />
                </span>
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={e =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  disabled={signupLoading}
                  required
                  style={{
                    background: 'rgba(30, 20, 50, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px'
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#e5e5e5' }}>
                Documento
              </label>
              <div className="flex items-center rounded-md border border-white/10">
                <span className="pl-3 text-gray-400" style={{ paddingRight: '10px' }}>
                  <IdCard size={18} />
                </span>
                <Input
                  type="tel"
                  placeholder="12345678"
                  value={formData.numero_documento}
                  required
                  maxLength={12}
                  onChange={e => {
                    const soloNumeros = e.target.value.replace(/\D/g, '')
                    setFormData({
                      ...formData,
                      numero_documento: soloNumeros
                    })
                  }}
                  disabled={signupLoading}
                  style={{
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
              <div className="flex items-center rounded-md border border-white/10">
                <span className="pl-3 text-gray-400" style={{ paddingRight: '10px' }}>
                  <Phone size={18} />
                </span>
                <Input
                  type="tel"
                  placeholder="900 000 000"
                  value={formData.telefono}
                  required
                  maxLength={9}
                  onChange={e =>
                    setFormData({ ...formData, telefono: e.target.value })
                  }
                  disabled={signupLoading}
                  style={{
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
                Fecha de nacimiento
                <span className="text-gray-500"> * mayor de edad (18 años)</span>
              </label>
              <div className="flex items-center rounded-md border border-white/10">
                <span className="pl-3 text-gray-400" style={{ paddingRight: '10px' }}>
                  <Calendar size={18} />
                </span>
                <Input
                  type="date"
                  placeholder="dd/mm/yyyy"
                  value={formData.fecha_nacimiento}
                  required
                  onChange={e =>
                    setFormData({
                      ...formData,
                      fecha_nacimiento: e.target.value
                    })
                  }
                  disabled={signupLoading}
                  max={maxDateStr}
                  style={{
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
              <div className="flex items-center rounded-md border border-white/10">
                <span className="pl-3 text-gray-400" style={{ paddingRight: '10px' }}>
                  <Lock size={18} />
                </span>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={signupPassword}
                  onChange={e => setSignupPassword(e.target.value)}
                  disabled={signupLoading}
                  required
                  style={{
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
              <div className="flex items-center rounded-md border border-white/10">
                <span className="pl-3 text-gray-400" style={{ paddingRight: '10px' }}>
                  <Lock size={18} />
                </span>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={signupPassword2}
                  onChange={e => setSignupPassword2(e.target.value)}
                  disabled={signupLoading}
                  required
                  style={{
                    background: 'rgba(30, 20, 50, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    borderRadius: '8px'
                  }}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={signupLoading}>
              {signupLoading ? 'Creando cuenta...' : 'Crear cuenta y registrar entrada'}
            </Button>

            <p className="text-sm text-center text-gray-400">
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                className="text-primary underline"
                onClick={() => {
                  setSignupOpen(false)
                  setSignupOpen2(true)
                }}
              >
                Inicia sesión
              </button>
            </p>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de login */}
      <Dialog open={signupOpen2} onOpenChange={setSignupOpen2}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inicia sesión</DialogTitle>
            <DialogDescription>
              Inicia sesión para guardar tu entrada en tu perfil.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#e5e5e5' }}>
                Email
              </label>
              <div className="flex items-center rounded-md border border-white/10">
                <span className="pl-3 text-gray-400" style={{ paddingRight: '10px' }}>
                  <Mail size={18} />
                </span>
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={e =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  disabled={loginLoading}
                  required
                  className="bg-transparent text-white focus-visible:ring-0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#e5e5e5' }}>
                Contraseña
              </label>
              <div className="flex items-center rounded-md border border-white/10">
                <span className="pl-3 text-gray-400" style={{ paddingRight: '10px' }}>
                  <Lock size={18} />
                </span>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  disabled={loginLoading}
                  required
                  className="bg-transparent text-white focus-visible:ring-0"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loginLoading}
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
              {loginLoading ? 'Iniciando sesión...' : 'Iniciar sesión y registrar entrada'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
