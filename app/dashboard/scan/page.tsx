'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Scanner } from '@yudiel/react-qr-scanner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CheckCircle2, XCircle, Camera, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ScannedTicket {
    id: string
    codigo: string
    usado: boolean
    users: {
        nombre: string
        email: string
    } | null
    event_zones: {
        club_zones: {
            nombre: string
        } | null
        events: {
            nombre: string
            fecha_inicio: string
            clubs: {
                nombre: string
            } | null
        } | null
    } | null
}

export default function ScanTicketPage() {
    const [scanning, setScanning] = useState(true)
    const [ticket, setTicket] = useState<ScannedTicket | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [processing, setProcessing] = useState(false)
    const [cameraError, setCameraError] = useState(false)
    const router = useRouter()

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        // Check if user has permission to scan tickets
        const checkPermissions = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
            }
        }
        checkPermissions()
    }, [router, supabase])

    const handleScan = async (result: any) => {
        if (processing || !result || result.length === 0) return

        const qrData = result[0]?.rawValue
        if (!qrData) {
            setError('QR no válido')
            setTimeout(() => {
                setError(null)
            }, 2000)
            return
        }

        setProcessing(true)
        setError(null)
        setTicket(null)
        setScanning(false) // Stop scanning while processing

        try {
            // Query ticket by QR data
            const { data: ticketData, error: ticketError } = await supabase
                .from('tickets')
                .select(`
          id,
          codigo,
          usado,
          users (
            nombre,
            email
          ),
          event_zones (
            club_zones ( nombre ),
            events (
              nombre,
              fecha_inicio,
              clubs ( nombre )
            )
          )
        `)
                .eq('qr_data', qrData)
                .single()

            if (ticketError || !ticketData) {
                setError('QR no válido - No pertenece a ninguna entrada del sistema')
                setProcessing(false)
                setTimeout(() => {
                    setError(null)
                    setScanning(true)
                }, 3000)
                return
            }

            setTicket(ticketData as unknown as ScannedTicket)
            setProcessing(false)
        } catch (err) {
            console.error('Error scanning ticket:', err)
            setError('QR no válido - Error al procesar el código')
            setProcessing(false)
            setTimeout(() => {
                setError(null)
                setScanning(true)
            }, 3000)
        }
    }

    const handleMarkAsUsed = async () => {
        if (!ticket) return

        try {
            const { error: updateError } = await supabase
                .from('tickets')
                .update({ usado: true })
                .eq('id', ticket.id)

            if (updateError) throw updateError

            setTicket({ ...ticket, usado: true })
        } catch (err) {
            console.error('Error marking ticket as used:', err)
            setError('Error al marcar la entrada como usada')
        }
    }

    const handleScanAnother = () => {
        setTicket(null)
        setError(null)
        setScanning(true)
    }

    return (
        <div className="min-h-screen bg-background p-4">
            <header className="mb-6">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver
                </Button>
                <h1 className="text-2xl font-bold">Escanear Entrada</h1>
            </header>

            <div className="max-w-2xl mx-auto space-y-6">
                {/* Scanner */}
                {scanning && !ticket && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Camera className="w-5 h-5" />
                                Apunta la cámara al código QR
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative aspect-square w-full max-w-md mx-auto rounded-lg overflow-hidden bg-black">
                                {!cameraError ? (
                                    <Scanner
                                        onScan={handleScan}
                                        onError={(error: Error) => {
                                            console.error('Camera error:', error)
                                            setCameraError(true)
                                        }}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-white">
                                        <div className="text-center">
                                            <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                                            <p>No se pudo acceder a la cámara</p>
                                            <p className="text-sm text-gray-400 mt-2">
                                                Verifica los permisos de tu navegador
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {processing && (
                                <p className="text-center text-muted-foreground mt-4">
                                    Procesando...
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Error Message */}
                {error && (
                    <Card className="border-red-500">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3 text-red-500">
                                <XCircle className="w-8 h-8" />
                                <div>
                                    <p className="font-semibold">Error</p>
                                    <p className="text-sm">{error}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Ticket Details */}
                {ticket && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Detalles de la Entrada</CardTitle>
                                <Badge
                                    variant={ticket.usado ? 'secondary' : 'default'}
                                    className={ticket.usado ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}
                                >
                                    {ticket.usado ? (
                                        <>
                                            <XCircle className="w-4 h-4 mr-1" />
                                            Ya Usada
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 mr-1" />
                                            Válida
                                        </>
                                    )}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Código</p>
                                <p className="font-mono font-bold text-lg">{ticket.codigo}</p>
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground">Titular</p>
                                <p className="font-semibold">{ticket.users?.nombre || 'N/A'}</p>
                                <p className="text-sm text-muted-foreground">{ticket.users?.email || ''}</p>
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground">Evento</p>
                                <p className="font-semibold">{ticket.event_zones?.events?.nombre || 'N/A'}</p>
                                <p className="text-sm text-muted-foreground">
                                    {ticket.event_zones?.events?.fecha_inicio &&
                                        format(
                                            new Date(ticket.event_zones.events.fecha_inicio),
                                            "EEEE d 'de' MMMM, yyyy 'a las' HH:mm'hs'",
                                            { locale: es }
                                        )}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground">Ubicación</p>
                                <p className="font-semibold">{ticket.event_zones?.events?.clubs?.nombre || 'N/A'}</p>
                                <p className="text-sm text-muted-foreground">{ticket.event_zones?.club_zones?.nombre || ''}</p>
                            </div>

                            <div className="flex gap-2 pt-4">
                                {!ticket.usado && (
                                    <Button
                                        onClick={handleMarkAsUsed}
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Marcar como Usada
                                    </Button>
                                )}
                                <Button
                                    onClick={handleScanAnother}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    Escanear Otra
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
