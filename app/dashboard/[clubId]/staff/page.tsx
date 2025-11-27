'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Check, Copy, IdCard, UserPlus } from 'lucide-react'

interface StaffInvite {
    id: string
    token: string
    used: boolean
    created_at: string
}

interface Staff {
    id: string
    user_id: string
    club_id: string
    created_at: string
    activo: boolean
    users: {
        id: string
        nombre: string
        numero_documento: string
        activo: boolean
        telefono: string
    }
}

export default function StaffPage() {
    const params = useParams()
    const clubId = params.clubId as string
    const [invites, setInvites] = useState<StaffInvite[]>([])
    const [staff, setStaff] = useState<Staff[]>([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [copiedLink, setCopiedLink] = useState<string | null>(null)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        loadInvites()
        loadStaff()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clubId])

    const loadInvites = async () => {
        try {
            const { data, error } = await supabase
                .from('staff_invites')
                .select('*')
                .eq('club_id', clubId)
                .order('created_at', { ascending: false })

            if (error) throw error
            setInvites(data || [])
        } catch (error) {
            console.error('Error loading invites:', error)
            toast.error('Error al cargar invitaciones')
        } finally {
            setLoading(false)
        }
    }

    const loadStaff = async () => {
        try {
            const { data, error } = await supabase
                .from('staff')
                .select('*, users(*)')
                .eq('club_id', clubId)
                .order('created_at', { ascending: false })

            if (error) throw error
            setStaff(data || [])
        } catch (error) {
            console.error('Error loading staff:', error)
            toast.error('Error al cargar staff')
        } finally {
            setLoading(false)
        }
    }

    const generateInvite = async () => {
        setGenerating(true)
        try {
            const token =
                Math.random().toString(36).substring(2, 15) +
                Math.random().toString(36).substring(2, 15)

            const { data, error } = await supabase
                .from('staff_invites')
                .insert({
                    club_id: clubId,
                    token,
                    used: false
                })
                .select()
                .single()

            if (error) throw error

            setInvites(prev => (data ? [data, ...prev] : prev))
            toast.success('Invitación generada correctamente')
        } catch (error) {
            console.error('Error generating invite:', error)
            toast.error('Error al generar invitación')
        } finally {
            setGenerating(false)
        }
    }

    const copyLink = (token: string) => {
        const url = `${window.location.origin}/staff-invite/${token}`
        navigator.clipboard.writeText(url)
        toast.success('Link copiado al portapapeles')
        setCopiedLink(token)

        setTimeout(() => {
            setCopiedLink(null)
        }, 2000)
    }


    return (
        <div className="p-4 space-y-6 md:p-8">
            {/* Header mobile-first */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-xl font-bold md:text-3xl">Gestión de Staff</h1>
                    <p className="text-sm text-muted-foreground md:text-base">
                        Genera enlaces de invitación para nuevos miembros del staff
                    </p>
                </div>
                <Button
                    onClick={generateInvite}
                    disabled={generating}
                    className="w-full sm:w-auto"
                >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {generating ? 'Generando...' : 'Generar Invitación'}
                </Button>
            </div>

            <div className="grid gap-4">
                {/* Invitaciones */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base md:text-lg">
                            Invitaciones Generadas
                        </CardTitle>
                        <CardDescription>
                            Lista de enlaces de invitación generados y su estado
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p className="py-4 text-sm text-center">Cargando...</p>
                        ) : invites.length === 0 ? (
                            <p className="py-8 text-sm text-center text-muted-foreground">
                                No hay invitaciones generadas aún.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {invites.map(invite => (
                                    <div
                                        key={invite.id}
                                        className="flex flex-col gap-3 p-3 border rounded-lg bg-card/50 md:flex-row md:items-center md:justify-between md:p-4"
                                    >
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium">
                                                Token:{' '}
                                                <span className="font-mono text-xs break-all">
                                                    {invite.token}
                                                </span>
                                            </p>
                                            <p className="text-xs text-muted-foreground md:text-sm">
                                                Creado:{' '}
                                                {new Date(invite.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center md:gap-4">
                                            <div
                                                className={`px-2 py-1 rounded text-xs text-center ${invite.used
                                                    ? 'bg-yellow-500/10 text-yellow-500'
                                                    : 'bg-green-500/10 text-green-500'
                                                    }`}
                                            >
                                                {invite.used ? 'Usado' : 'Disponible'}
                                            </div>
                                            {!invite.used && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => copyLink(invite.token)}
                                                    className="w-full md:w-auto cursor-pointer"
                                                >
                                                    {copiedLink === invite.token ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                    Copiar Link
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Staff */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base md:text-lg">Staff</CardTitle>
                        <CardDescription>Lista de miembros del staff</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p className="py-4 text-sm text-center">Cargando...</p>
                        ) : staff.length === 0 ? (
                            <p className="py-8 text-sm text-center text-muted-foreground">
                                No hay miembros del staff.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {staff.map(member => (
                                    <div
                                        key={member.id}
                                        className="flex flex-col gap-3 p-3 border rounded-lg bg-card/50 md:flex-row md:items-center md:justify-between md:p-4"
                                    >
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium md:text-base">
                                                {member.users.nombre}
                                            </p>
                                            <p className="text-xs text-muted-foreground md:text-sm">
                                                Documento: {member.users.numero_documento}
                                            </p>
                                            <p className="text-xs text-muted-foreground md:text-sm">
                                                Telefono: {member.users.telefono}
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-end">
                                            <div
                                                className={`px-2 py-1 rounded text-xs ${member.activo
                                                    ? 'bg-green-500/10 text-green-500'
                                                    : 'bg-red-500/10 text-red-500'
                                                    }`}
                                            >
                                                {member.activo ? 'Activo' : 'Inactivo'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
