'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'

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
    clubs: {
      nombre: string
    } | null
  } | null
}

// --- Helpers ---

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function formatFechaCompleta(fecha: string) {
  const date = new Date(fecha)

  const opcionesDia = { weekday: 'long' } as const
  const opcionesFecha = { day: 'numeric', month: 'long' } as const

  const dia = date.toLocaleDateString('es-PE', opcionesDia)
  const fechaTexto = date.toLocaleDateString('es-PE', opcionesFecha)

  // Usamos la hora "UTC" para evitar el corrimiento a zona local
  let horas = date.getUTCHours()
  const minutos = date.getUTCMinutes().toString().padStart(2, '0')

  const ampm = horas >= 12 ? 'pm' : 'am'
  horas = horas % 12
  if (horas === 0) horas = 12

  return `${capitalizar(dia)} ${fechaTexto} a las ${horas}:${minutos} ${ampm}`
}

function generarCodigoTicket() {
  /* if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
     return 'TK-' + crypto.randomUUID().split('-')[0].toUpperCase()
   }
   return 'TK-' + Math.random().toString(36).substring(2, 10).toUpperCase()*/
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

  const { error } = await supabase
    .from('tickets')
    .insert({
      event_zone_id: eventZoneId,
      user_id: user.id,
      promoter_id: promoterId ?? null,
      promoter_link_id: promoterLinkId ?? null,
      codigo,
      qr_data: linkAcceso,
      link_acceso: linkAcceso,
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
    numero_documento: ''
  })
  const [submitting, setSubmitting] = useState(false)

  // dialog de registro
  const [signupOpen, setSignupOpen] = useState(false)
  const [signupPassword, setSignupPassword] = useState('')
  const [signupPassword2, setSignupPassword2] = useState('')
  const [signupLoading, setSignupLoading] = useState(false)

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
        setFormData((prev) => ({
          ...prev,
          nombre: (data.user.user_metadata as any)?.nombre || prev.nombre,
          email: data.user.email || prev.email,
        }))
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const loadLinkData = async () => {
    try {
      // obtener link
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

      // obtener zona + evento + club
      const { data: zone, error: zoneError } = await supabase
        .from('event_zones')
        .select(`
          id,
          event_id,
          club_zones ( nombre ),
          events (
            nombre,
            fecha_inicio,
            clubs ( nombre )
          )
        `)
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
        // no logueado → abrir dialog de registro
        if (!formData.nombre || !formData.email) {
          toast.error('Completa tu nombre y correo para continuar')
          setSubmitting(false)
          return
        }
        setSignupOpen(true)
        setSubmitting(false)
        return
      }

      // ya logueado → crear ticket directamente
      await createTicketForUser({
        supabase,
        user: data.user,
        eventZoneId: zoneData.id,
        promoterId: linkData.promoter_id,
        promoterLinkId: linkData.id,
      })

      // actualizar contador de usos
      await supabase
        .from('promoter_links')
        .update({ usados: (linkData.usados ?? 0) + 1 })
        .eq('id', linkData.id)

      toast.success('Entrada registrada exitosamente')
      router.push('/') // o /dashboard/tickets
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al registrar la entrada')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
            nombre: formData.nombre,
          },
        },
      })

      if (error) {
        console.error(error)
        toast.error(error.message)
        setSignupLoading(false)
        return
      }

      if (signUpData.user) {
        const { error: insertError } = await supabase
          .from('users')
          .insert([
            {
              id: signUpData.user.id,
              email: formData.email,
              nombre: formData.nombre,
              telefono: formData.telefono,
              numero_documento: formData.numero_documento
            },
          ])

        if (insertError) {
          console.error('Error creating user record:', insertError)
          setLoading(false)
          return
        }

        const { error: insertError2 } = await supabase
          .from('user_roles')
          .insert([
            {
              user_id: signUpData.user.id,
              role_id: 3
            },
          ])

        if (insertError2) {
          console.error('Error creating user record:', insertError2)
          setLoading(false)
          return
        }

      }

      // 👇 AQUÍ obtenemos el usuario recién creado
      const newUser = signUpData.user ?? signUpData.session?.user

      if (!newUser) {
        // Si tienes confirmación de email activada, aquí normalmente no hay sesión
        toast.message(
          'Te enviamos un correo de confirmación. Confirma tu cuenta y luego vuelve a este enlace.'
        )
        setSignupLoading(false)
        return
      }

      setUser(newUser)

      // crear ticket con el usuario recién creado ✅
      if (!zoneData || !linkData) {
        toast.error('Error interno: faltan datos del evento')
        setSignupLoading(false)
        return
      }

      await createTicketForUser({
        supabase,
        user: newUser,
        eventZoneId: zoneData.id,
        promoterId: linkData.promoter_id,
        promoterLinkId: linkData.id,
      })

      await supabase
        .from('promoter_links')
        .update({ usados: (linkData.usados ?? 0) + 1 })
        .eq('id', linkData.id)

      toast.success('Cuenta creada y entrada registrada')
      setSignupOpen(false)
      router.push('/') // o /dashboard/tickets
    } catch (error) {
      console.error(error)
      toast.error('Error al crear la cuenta o el ticket')
    } finally {
      setSignupLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center ">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  if (!linkData || !zoneData) {
    return (
      <div className="min-h-screen flex items-center justify-center  px-4">
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

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center px-4 py-8">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-center">
              {zoneData.events?.clubs?.nombre || 'Evento'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Info del evento */}
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Evento</p>
                <p className="font-medium">{zoneData.events?.nombre}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Zona</p>
                <p className="font-medium">{zoneData.club_zones?.nombre}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inicio</p>
                <p className="font-medium">
                  {formatFechaCompleta(zoneData.events?.fecha_inicio ?? '')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cupos disponibles</p>
                <p className="text-lg font-bold">{remainingQuota}</p>
              </div>
            </div>

            {/* Formulario de registro */}
            {!isQuotaFull ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    submitting || !formData.nombre || !formData.email
                  }
                >
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
              <Label>Nombre</Label>
              <Input
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label>Correo</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label>DNI o CE:</Label>
              <Input
                value={formData.numero_documento}
                onChange={(e) =>
                  setFormData({ ...formData, numero_documento: e.target.value })
                }
                required
                placeholder="12345678"
              />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input
                value={formData.telefono}
                onChange={(e) =>
                  setFormData({ ...formData, telefono: e.target.value })
                }
                required
                placeholder="987654321"
              />
            </div>
            <div>
              <Label>Contraseña</Label>
              <Input
                type="password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Confirmar contraseña</Label>
              <Input
                type="password"
                value={signupPassword2}
                onChange={(e) => setSignupPassword2(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={signupLoading}
            >
              {signupLoading
                ? 'Creando cuenta...'
                : 'Crear cuenta y registrar entrada'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
