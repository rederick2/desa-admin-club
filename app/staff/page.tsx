'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Scanner } from '@yudiel/react-qr-scanner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { LogOut, QrCode, Search, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { UserIcon } from 'lucide-react'

interface TicketDetails {
    id: string
    codigo: string
    used: boolean // Note: Database field might be 'usados' in promoter_links, but for individual tickets we need a status. 
    // Wait, the ticket table structure needs to be checked. 
    // In `invite/[token]/page.tsx` we insert into `tickets`. 
    // Let's check `tickets` table definition or infer it.
    // Based on previous conversations, tickets table has `usado` boolean? 
    // I'll assume `usado` or `used`. I'll check the table schema if possible or try to select it.
    // Actually, I'll check the `tickets` table schema first to be sure.
    usado: boolean
    validado: boolean
    event_zones: {
        events: {
            nombre: string
            clubs: {
                nombre: string
            }
        }
        club_zones: {
            nombre: string
        }
    }
    users: {
        nombre: string
        email: string
        numero_documento: string
    }
}

export default function StaffDashboard() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [scanning, setScanning] = useState(false)
    const [manualCode, setManualCode] = useState('')
    const [ticketData, setTicketData] = useState<TicketDetails | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [processing, setProcessing] = useState(false)

    const [scannedHistory, setScannedHistory] = useState<TicketDetails[]>([])
    const [searchTerm, setSearchTerm] = useState('')

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        checkStaffRole()
    }, [])

    useEffect(() => {
        if (user) {
            loadScanHistory()
        }
    }, [user])

    const loadScanHistory = async () => {
        if (!user) return

        const { data, error } = await supabase
            .from('ticket_scans')
            .select(`
                id,
                scanned_at,
                valido,
                tickets (
                    codigo,
                    users (
                        nombre,
                        numero_documento
                    )
                )
            `)
            .eq('staff_id', user.id)
            .order('scanned_at', { ascending: false })

        if (error) {
            console.error('Error loading history:', error)
            return
        }

        // Transform data to match TicketDetails structure partially or create a new interface
        // The current UI expects TicketDetails. Let's map it or adjust the UI.
        // The UI uses: ticket.users.nombre, ticket.codigo, ticket.users.numero_documento
        // The fetch returns tickets -> users.

        const history = data.map((scan: any) => ({
            id: scan.id, // scan id, not ticket id, but unique for list
            codigo: scan.tickets.codigo,
            used: true,
            usado: true,
            scanned_at: scan.scanned_at,
            users: scan.tickets.users
        }))

        setScannedHistory(history as any)
    }

    const checkStaffRole = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push('/login')
            return
        }

        const { data: role } = await supabase
            .from('user_roles')
            .select('role_id')
            .eq('user_id', user.id)
            .single()

        if (!role || role.role_id !== 4) {
            toast.error('Acceso denegado. Área exclusiva para staff.')
            router.push('/')
            return
        }

        // Get user profile for name
        const { data: profile } = await supabase
            .from('users')
            .select('nombre')
            .eq('id', user.id)
            .single()

        if (profile) {
            user.user_metadata = { ...user.user_metadata, nombre: profile.nombre }
        }

        setUser(user)
        setLoading(false)
    }

    const handleScan = async (result: string) => {
        if (result) {
            setScanning(false)
            setLoading(true)
            let code = result
            if (result.includes('/ticket/')) {
                code = result.split('/ticket/')[1]
            }
            validateTicket(code)
        }
    }

    const validateTicket = async (code: string) => {
        setProcessing(true)
        setError(null)
        setTicketData(null)

        try {
            const { data, error } = await supabase
                .from('tickets')
                .select(`
          id,
          codigo,
          usado,
          event_zones (
            events (
              nombre,
              clubs ( nombre )
            ),
            club_zones ( nombre )
          ),
          users (
            nombre,
            email,
            numero_documento
          )
        `)
                .eq('codigo', code)
                .single()

            if (error || !data) {
                setError('Ticket no encontrado')
            } else {
                setLoading(false)
                setTicketData(data as any)
            }
        } catch (err) {
            console.error(err)
            setError('Error al validar ticket')
        } finally {
            setProcessing(false)
        }
    }

    const markAsUsed = async () => {
        if (!ticketData) return

        setProcessing(true)
        try {
            const { error } = await supabase
                .from('tickets')
                .update({ usado: true })
                .eq('id', ticketData.id)

            if (error) throw error

            // Insert into ticket_scans
            const { error: scanError } = await supabase
                .from('ticket_scans')
                .insert({
                    ticket_id: ticketData.id,
                    staff_id: user?.id,
                    valido: true,
                    scanned_at: new Date().toISOString(),
                    device_id: user?.user_metadata?.device_id,
                })

            if (scanError) {
                console.error('Error logging scan:', scanError)
            }

            const updatedTicket = { ...ticketData, usado: false, validado: true }
            setTicketData(updatedTicket)

            // Reload history
            loadScanHistory()

            toast.success('Ticket validado correctamente')
        } catch (err) {
            console.error(err)
            toast.error('Error al actualizar ticket')
        } finally {
            setProcessing(false)
        }
    }

    const filteredHistory = scannedHistory.filter(ticket =>
        ticket.users.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.users.numero_documento.includes(searchTerm) ||
        ticket.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) return <div className="min-h-screen flex items-center justify-center "
        style={{
            background: 'linear-gradient(135deg, #1a0b2e 0%, #2d1b4e 50%, #4a2c6d 100%)',
            minHeight: '100vh'
        }}>
        <p className="text-muted-foreground">Cargando...</p>
    </div>

    return (
        <div className="min-h-screen p-4 md:p-8"
            style={{
                background: 'linear-gradient(135deg, #1a0b2e 0%, #2d1b4e 50%, #4a2c6d 100%)',
                minHeight: '100vh',
                color: 'white'
            }}>

            <div className="max-w-md mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Bienvenido, {user?.user_metadata?.nombre || 'Staff'}</h1>
                        <p className="text-white/60 text-sm">Panel de Control de Acceso</p>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                className="rounded-xl h-10 w-10 bg-card border-0"
                            >
                                <UserIcon className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { }}>
                                Mi Perfil
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={async () => {
                                    await supabase.auth.signOut()
                                    router.push('/login')
                                }}
                            >
                                Cerrar Sesión
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {!ticketData && !error && (
                    <Card className="bg-card/90 border-white/10">
                        <CardContent className="pt-6 space-y-4">
                            {scanning ? (
                                <div className="space-y-4">
                                    <div className="aspect-square rounded-lg overflow-hidden relative">
                                        <Scanner
                                            onScan={(result) => {
                                                if (result && result.length > 0) {
                                                    handleScan(result[0].rawValue)
                                                }
                                            }}
                                        />
                                    </div>
                                    <Button variant="outline" className="w-full" onClick={() => setScanning(false)}>
                                        Cancelar Escaneo
                                    </Button>
                                </div>
                            ) : (
                                <Button className="w-full h-32 flex flex-col gap-2" onClick={() => setScanning(true)}>
                                    <QrCode className="h-12 w-12" />
                                    <span className="text-lg">Escanear QR</span>
                                </Button>
                            )}

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-white/10" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">O ingresar código</span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Input
                                    placeholder="TK-XXXXXX"
                                    value={manualCode}
                                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                                    className="bg-background/50"
                                />
                                <Button size="icon" onClick={() => validateTicket(manualCode)} disabled={!manualCode}>
                                    <Search className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {error && (
                    <Card className="bg-destructive/20 border-destructive">
                        <CardContent className="pt-6 text-center space-y-4">
                            <XCircle className="h-16 w-16 text-destructive mx-auto" />
                            <div>
                                <h3 className="text-xl font-bold text-destructive">Error</h3>
                                <p className="text-destructive-foreground">{error}</p>
                            </div>
                            <Button variant="outline" className="w-full" onClick={() => { setError(null); setScanning(true); }}>
                                Volver a escanear
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {ticketData && (
                    <Card className={`border-2 ${ticketData.usado ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-green-500/50 bg-green-500/10'}`}>
                        <CardHeader className="text-center pb-2">
                            {ticketData.usado ? (
                                <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-2" />
                            ) : (
                                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-2" />
                            )}
                            <CardTitle className={ticketData.usado ? 'text-yellow-500' : 'text-green-500'}>
                                {ticketData.usado ? 'TICKET YA USADO' : ticketData.validado ? 'TICKET VALIDADO' : 'TICKET VÁLIDO'}
                            </CardTitle>
                            <CardDescription className="text-white/70">
                                {ticketData.codigo}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between border-b border-white/10 pb-2">
                                    <span className="text-white/60">Evento:</span>
                                    <span className="font-medium text-right">{ticketData.event_zones.events.nombre}</span>
                                </div>
                                <div className="flex justify-between border-b border-white/10 pb-2">
                                    <span className="text-white/60">Zona:</span>
                                    <span className="font-medium text-right">{ticketData.event_zones.club_zones.nombre}</span>
                                </div>
                                <div className="flex justify-between border-b border-white/10 pb-2">
                                    <span className="text-white/60">Asistente:</span>
                                    <span className="font-medium text-right">{ticketData.users.nombre}</span>
                                </div>
                                <div className="flex justify-between border-b border-white/10 pb-2">
                                    <span className="text-white/60">DNI:</span>
                                    <span className="font-medium text-right">{ticketData.users.numero_documento}</span>
                                </div>
                            </div>

                            {!ticketData.usado ? (
                                ticketData.validado ? (
                                    <div className="p-3 bg-gray-500/20 rounded text-center text-gray-200 text-sm">
                                        <p>Este ticket se validó correctamente</p>
                                    </div>
                                ) : (
                                    <Button
                                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                                        size="lg"
                                        onClick={markAsUsed}
                                        disabled={processing}
                                    >
                                        {processing ? 'Procesando...' : 'MARCAR INGRESO'}
                                    </Button>)
                            ) : (
                                <div className="p-3 bg-yellow-500/20 rounded text-center text-yellow-200 text-sm">
                                    Este ticket ya fue registrado anteriormente.
                                </div>
                            )}

                            <Button variant="outline" className="w-full" onClick={() => { setTicketData(null); setScanning(true); }}>
                                Escanear otro
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Historial de Scaneos */}
                <div className="space-y-4 pt-8 border-t border-white/10">
                    <h2 className="text-lg font-semibold">Historial de Scaneos</h2>

                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre ..."
                            className="pl-9 bg-background/50"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        {filteredHistory.length === 0 ? (
                            <p className="text-center text-white/40 py-4 text-sm">
                                {searchTerm ? 'No se encontraron resultados' : 'No hay scaneos recientes'}
                            </p>
                        ) : (
                            filteredHistory.map((ticket) => (
                                <div key={ticket.id} className="bg-card/50 p-3 rounded-lg border border-white/5 flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-sm">{ticket.users.nombre}</p>
                                        <p className="text-xs text-white/60">{ticket.users.numero_documento} • {ticket.codigo}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                                            Ingresó
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
