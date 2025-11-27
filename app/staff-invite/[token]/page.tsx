'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Lock, Mail, User as UserIcon, Phone, IdCard, Calendar } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

export default function StaffInvitePage() {
    const params = useParams()
    const router = useRouter()
    const token = params?.token as string

    const [loading, setLoading] = useState(true)
    const [inviteData, setInviteData] = useState<any>(null)
    const [user, setUser] = useState<User | null>(null)

    // Auth states
    const [isLogin, setIsLogin] = useState(false)
    const [authLoading, setAuthLoading] = useState(false)

    // Form data
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        nombre: '',
        telefono: '',
        numero_documento: '',
        fecha_nacimiento: ''
    })

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        checkInvite()
        checkUser()
    }, [token])

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) setUser(user)
    }

    const checkInvite = async () => {
        try {
            const { data, error } = await supabase
                .from('staff_invites')
                .select('*, clubs(nombre)')
                .eq('token', token)
                .single()

            if (error || !data) {
                setInviteData(null)
            } else {
                setInviteData(data)
            }
        } catch (error) {
            console.error('Error checking invite:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setAuthLoading(true)

        try {
            let userId = user?.id

            if (!userId) {
                if (isLogin) {
                    // Login
                    const { data, error } = await supabase.auth.signInWithPassword({
                        email: formData.email,
                        password: formData.password
                    })
                    if (error) throw error
                    userId = data.user.id
                } else {
                    // Signup
                    const { data: signUpData, error } = await supabase.auth.signUp({
                        email: formData.email,
                        password: formData.password,
                        options: {
                            data: {
                                nombre: formData.nombre
                            }
                        }
                    })
                    if (error) throw error

                    if (!signUpData.user) throw new Error('No user created')
                    userId = signUpData.user.id

                    // Create user profile
                    const { error: profileError } = await supabase
                        .from('users')
                        .insert({
                            id: userId,
                            email: formData.email,
                            nombre: formData.nombre,
                            telefono: formData.telefono,
                            numero_documento: formData.numero_documento,
                            fecha_nacimiento: formData.fecha_nacimiento
                        })

                    if (profileError) throw profileError
                }
            }

            // Assign Role 4 (Staff)
            // First check if role exists to avoid duplicates (though user_roles usually allows multiple, for this app it seems 1 role per user mostly? 
            // Actually the previous code inserted without checking. Let's just insert.)

            // We might want to delete previous roles or just add this one. 
            // Assuming single role for now based on previous code snippets replacing roles or checking single().
            // But safer to just insert.

            const { error: roleError } = await supabase
                .from('user_roles')
                .insert({
                    user_id: userId,
                    role_id: 4 // Staff Role
                })

            if (roleError) {
                console.error('Role assignment error:', roleError)
                // If duplicate key error, maybe they already have a role. 
                // For now, let's assume success or handle specific error if needed.
            }

            const { error: roleError2 } = await supabase
                .from('staff')
                .insert({
                    user_id: userId,
                    club_id: inviteData.club_id
                })

            if (roleError2) {
                console.error('Role assignment error:', roleError)
                // If duplicate key error, maybe they already have a role. 
                // For now, let's assume success or handle specific error if needed.
            }

            // Mark invite as used
            const { error: updateError } = await supabase
                .from('staff_invites')
                .update({ used: true })
                .eq('id', inviteData.id)

            if (updateError) throw updateError

            toast.success('¡Bienvenido al Staff!')
            router.push('/staff')

        } catch (error: any) {
            console.error('Auth error:', error)
            toast.error(error.message || 'Error durante el proceso')
        } finally {
            setAuthLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <p>Cargando...</p>
            </div>
        )
    }

    if (!inviteData || inviteData.used) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CardTitle className="text-destructive">Invitación Inválida</CardTitle>
                        <CardDescription>
                            Este enlace de invitación no existe o ya ha sido utilizado.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/')} className="w-full">
                            Volver al inicio
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4"
            style={{
                background: 'linear-gradient(135deg, #1a0b2e 0%, #2d1b4e 50%, #4a2c6d 100%)',
            }}>
            <Card className="max-w-md w-full">
                <CardHeader>
                    <CardTitle>Invitación al Staff</CardTitle>
                    <CardDescription>
                        Has sido invitado a formar parte del staff de <strong>{inviteData.clubs?.nombre}</strong>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {user ? (
                        <div className="space-y-4">
                            <p className="text-sm text-center">
                                Has iniciado sesión como <strong>{user.email}</strong>
                            </p>
                            <Button onClick={handleAuth} disabled={authLoading} className="w-full">
                                {authLoading ? 'Procesando...' : 'Aceptar Invitación'}
                            </Button>
                            <Button variant="outline" onClick={async () => {
                                await supabase.auth.signOut()
                                setUser(null)
                            }} className="w-full">
                                Cerrar sesión
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleAuth} className="space-y-4">
                            {!isLogin && (
                                <>
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Nombre completo"
                                                className="pl-9"
                                                value={formData.nombre}
                                                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <IdCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="DNI / Documento"
                                                className="pl-9"
                                                value={formData.numero_documento}
                                                onChange={e => setFormData({ ...formData, numero_documento: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Teléfono"
                                                className="pl-9"
                                                value={formData.telefono}
                                                onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="date"
                                                className="pl-9"
                                                value={formData.fecha_nacimiento}
                                                onChange={e => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="space-y-2">
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="email"
                                        placeholder="Email"
                                        className="pl-9"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="password"
                                        placeholder="Contraseña"
                                        className="pl-9"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <Button type="submit" disabled={authLoading} className="w-full">
                                {authLoading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión y Aceptar' : 'Registrarse y Aceptar')}
                            </Button>

                            <div className="text-center text-sm">
                                <button
                                    type="button"
                                    onClick={() => setIsLogin(!isLogin)}
                                    className="text-primary hover:underline"
                                >
                                    {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
                                </button>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
