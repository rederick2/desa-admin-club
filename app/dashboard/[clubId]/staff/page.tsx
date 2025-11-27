'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Copy, RefreshCw, UserPlus } from 'lucide-react'

interface StaffInvite {
    id: string
    token: string
    used: boolean
    created_at: string
}

export default function StaffPage() {
    const params = useParams()
    const clubId = params.clubId as string
    const [invites, setInvites] = useState<StaffInvite[]>([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        loadInvites()
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

    const generateInvite = async () => {
        setGenerating(true)
        try {
            // Generate a random token
            const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

            const { data, error } = await supabase
                .from('staff_invites')
                .insert({
                    club_id: clubId,
                    token: token,
                    used: false
                })
                .select()
                .single()

            if (error) throw error

            setInvites([data, ...invites])
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
    }

    return (
        <div className="space-y-6 p-4 md:p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Gestión de Staff</h1>
                    <p className="text-muted-foreground">
                        Genera enlaces de invitación para nuevos miembros del staff
                    </p>
                </div>
                <Button onClick={generateInvite} disabled={generating}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    {generating ? 'Generando...' : 'Generar Invitación'}
                </Button>
            </div>

            <div className="grid gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Invitaciones Generadas</CardTitle>
                        <CardDescription>
                            Lista de enlaces de invitación generados y su estado
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p className="text-center py-4">Cargando...</p>
                        ) : invites.length === 0 ? (
                            <p className="text-center py-8 text-muted-foreground">
                                No hay invitaciones generadas aún.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {invites.map((invite) => (
                                    <div
                                        key={invite.id}
                                        className="flex items-center justify-between p-4 border rounded-lg bg-card/50"
                                    >
                                        <div className="space-y-1">
                                            <p className="font-medium">
                                                Token: <span className="font-mono text-sm">{invite.token}</span>
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Creado: {new Date(invite.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className={`px-2 py-1 rounded text-xs ${invite.used
                                                    ? 'bg-yellow-500/10 text-yellow-500'
                                                    : 'bg-green-500/10 text-green-500'
                                                }`}>
                                                {invite.used ? 'Usado' : 'Disponible'}
                                            </div>
                                            {!invite.used && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => copyLink(invite.token)}
                                                >
                                                    <Copy className="h-4 w-4 mr-2" />
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
            </div>
        </div>
    )
}
