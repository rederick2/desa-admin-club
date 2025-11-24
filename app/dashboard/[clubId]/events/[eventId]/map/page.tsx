'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { RealtimeChannel } from '@supabase/supabase-js'

interface Point {
  x: number
  y: number
}

interface ClubZone {
  id: string
  nombre: string
  pos_x: number | null
  pos_y: number | null
  width_pct: number | null
  height_pct: number | null
  es_zona_boxes: boolean | null
  tipo_forma: 'rect' | 'circle' | 'poly' | null
  lados: number | null
  puntos: Point[] | null
}

interface EventZone {
  id: string
  tipo: string | null
  capacidad: number | null
  club_zones: ClubZone | null
}

interface Box {
  id: string
  event_zone_id: string
  numero: number
  estado: string | null
  pos_x?: number
  pos_y?: number
}

export default function EventMapPage() {
  const params = useParams()
  const clubId = params?.clubId as string
  const eventId = params?.eventId as string

  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ))

  const [clubName, setClubName] = useState('')
  const [eventName, setEventName] = useState('')
  const [bgUrl, setBgUrl] = useState<string | null>(null)
  const [zones, setZones] = useState<EventZone[]>([])
  const [boxes, setBoxes] = useState<Box[]>([])
  const [ticketCounts, setTicketCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [realtimeStatus, setRealtimeStatus] = useState<string>('DISCONNECTED')

  const containerRef = useRef<HTMLDivElement | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!clubId || !eventId) return
    void loadData()
  }, [clubId, eventId])

  useEffect(() => {
    if (zones.length === 0) return

    console.log('Setting up real-time subscription for zones:', zones.map(z => z.id))
    setRealtimeStatus('CONNECTING')

    const channel = supabase
      .channel(`event_live_updates_${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Escuchar TODO (INSERT, UPDATE, DELETE) para depurar
          schema: 'public',
          table: 'boxes',
          filter: `event_zone_id=in.(${zones.map(z => z.id).join(',')})`
        },
        (payload) => {
          console.log('ANY Box change received:', payload)
          if (payload.eventType === 'UPDATE') {
            const updatedBox = payload.new as Box
            setBoxes(prev => prev.map(b =>
              b.id === updatedBox.id
                ? { ...b, ...updatedBox, pos_x: b.pos_x, pos_y: b.pos_y } // Preserve position
                : b
            ))
          }
        }
      )
      .on('system', { event: '*' }, (payload) => {
        console.log('System event:', payload)
      })
      .on('broadcast', { event: 'test' }, (payload) => {
        console.log('BROADCAST RECEIVED:', payload)
        alert('Conexión Realtime OK: Mensaje de prueba recibido')
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tickets',
          filter: `event_zone_id=in.(${zones.map(z => z.id).join(',')})`
        },
        (payload) => {
          console.log('Ticket insert received:', payload)
          const newTicket = payload.new as any
          if (newTicket.event_zone_id) {
            setTicketCounts(prev => ({
              ...prev,
              [newTicket.event_zone_id]: (prev[newTicket.event_zone_id] || 0) + 1
            }))
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
        setRealtimeStatus(status)
      })

    channelRef.current = channel

    return () => {
      console.log('Cleaning up subscription')
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [zones, eventId, supabase])

  const testConnection = async () => {
    console.log('Testing connection...')
    if (!channelRef.current) {
      alert('Error: No hay canal activo')
      return
    }

    const status = await channelRef.current.send({
      type: 'broadcast',
      event: 'test',
      payload: { message: 'Test connection' },
    })
    console.log('Send status:', status)
    if (status !== 'ok') {
      alert(`Error al enviar mensaje: ${status}`)
    }
  }

  const loadData = async () => {
    setLoading(true)

    // Club
    const { data: club } = await supabase
      .from('clubs')
      .select('nombre, map_background_url')
      .eq('id', clubId)
      .single()

    if (club) {
      setClubName(club.nombre)
      setBgUrl(club.map_background_url)
    }

    // Evento
    const { data: event } = await supabase
      .from('events')
      .select('nombre')
      .eq('id', eventId)
      .single()

    if (event) setEventName(event.nombre)

    // Zonas
    const { data: eventZones } = await supabase
      .from('event_zones')
      .select(`
        id,
        tipo,
        capacidad,
        club_zones (
          id,
          nombre,
          pos_x,
          pos_y,
          width_pct,
          height_pct,
          es_zona_boxes,
          tipo_forma,
          lados,
          puntos
        )
      `)
      .eq('event_id', eventId)

    const zonesList = (eventZones?.map((z: any) => ({
      ...z,
      club_zones: Array.isArray(z.club_zones) ? z.club_zones[0] : z.club_zones
    })) as EventZone[]) ?? []
    setZones(zonesList)

    // Boxes
    if (zonesList.length > 0) {
      const zoneIds = zonesList.map(z => z.id)
      const clubZoneIds = zonesList.map(z => z.club_zones?.id).filter(Boolean) as string[]

      const [boxesResult, clubBoxesResult] = await Promise.all([
        supabase
          .from('boxes')
          .select('id, event_zone_id, numero, estado')
          .in('event_zone_id', zoneIds),
        supabase
          .from('club_zone_boxes')
          .select('club_zone_id, numero_box, pos_x, pos_y')
          .in('club_zone_id', clubZoneIds)
      ])

      const boxesData = boxesResult.data as Box[] ?? []
      const clubBoxesData = clubBoxesResult.data as any[] ?? []

      // Merge position data into boxes
      const boxesWithPos = boxesData.map(box => {
        // Find the event zone for this box
        const zone = zonesList.find(z => z.id === box.event_zone_id)
        if (!zone || !zone.club_zones) return box

        // Find the corresponding club box
        const clubBox = clubBoxesData.find(cb =>
          cb.club_zone_id === zone.club_zones?.id &&
          cb.numero_box === box.numero
        )

        return {
          ...box,
          pos_x: clubBox?.pos_x ?? 0,
          pos_y: clubBox?.pos_y ?? 0
        }
      })

      setBoxes(boxesWithPos)

      // Tickets
      const { data: ticketsData } = await supabase
        .from('tickets')
        .select('event_zone_id, event_zones!inner(event_id)')
        .eq('event_zones.event_id', eventId)

      const counts: Record<string, number> = {}
      if (ticketsData) {
        ticketsData.forEach((t: any) => {
          if (t.event_zone_id) {
            counts[t.event_zone_id] = (counts[t.event_zone_id] || 0) + 1
          }
        })
      }
      setTicketCounts(counts)

    } else {
      setBoxes([])
    }

    setLoading(false)
  }

  // Helper for Polygon Points String
  const getPolygonPointsString = (zone: ClubZone) => {
    if (zone.puntos && zone.puntos.length > 0) {
      return zone.puntos.map(p => `${p.x},${p.y}`).join(' ')
    }
    // Fallback
    const sides = zone.lados || 4
    const points = []
    for (let i = 0; i < sides; i++) {
      const angle = (2 * Math.PI * i) / sides - Math.PI / 2
      const x = 50 + 50 * Math.cos(angle)
      const y = 50 + 50 * Math.sin(angle)
      points.push(`${x},${y}`)
    }
    return points.join(' ')
  }

  const [scale, setScale] = useState(1)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleResize = () => {
      if (wrapperRef.current) {
        const parentWidth = wrapperRef.current.parentElement?.clientWidth || 800
        const baseWidth = 800
        // Calculate scale to fit width, max 1 (don't scale up)
        const newScale = Math.min((parentWidth - 32) / baseWidth, 1) // -32 for padding
        setScale(Math.max(newScale, 0.1)) // Min scale to avoid 0
      }
    }

    window.addEventListener('resize', handleResize)
    // Call after a small delay to ensure parent is rendered
    setTimeout(handleResize, 100)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          Cargando mapa en vivo...
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4 bg-background min-h-screen flex flex-col">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">
            Mapa en Vivo: {eventName || 'Evento'}
          </h1>
          {clubName && (
            <p className="text-sm text-muted-foreground">
              ({clubName})
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${realtimeStatus === 'SUBSCRIBED' ? 'bg-green-100 text-green-800' :
            realtimeStatus === 'CONNECTING' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
            <span className={`w-2 h-2 rounded-full ${realtimeStatus === 'SUBSCRIBED' ? 'bg-green-600 animate-pulse' : 'bg-current'}`} />
            {realtimeStatus === 'SUBSCRIBED' ? 'En vivo' : realtimeStatus}
          </span>
          <button
            onClick={testConnection}
            className="flex-1 md:flex-none text-xs bg-blue-100 text-blue-800 px-3 py-1.5 rounded hover:bg-blue-200 text-center"
          >
            Probar Conexión
          </button>
        </div>
      </div>

      {/* CANVAS */}
      <div className="flex-1 bg-zinc-900 p-4 rounded-lg flex flex-col items-center">
        <div
          ref={wrapperRef}
          className="w-full flex justify-center"
          style={{ height: 1000 * scale }}
        >
          <div
            ref={containerRef}
            className="relative w-[800px] h-[1000px] bg-zinc-950 shadow-2xl rounded-lg overflow-hidden border border-zinc-800 origin-top"
            style={{
              transform: `scale(${scale})`,
            }}
          >
            {bgUrl ? (
              <img
                src={bgUrl}
                alt="Mapa del club"
                className="w-full h-full object-cover pointer-events-none select-none opacity-60"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-700">
                <span className="text-sm">Sin imagen de fondo</span>
              </div>
            )}

            {zones.map(zone => {
              const cz = zone.club_zones
              if (!cz) return null

              const xPx = ((cz.pos_x ?? 0) / 100) * 800
              const yPx = ((cz.pos_y ?? 0) / 100) * 1000
              const widthPx = ((cz.width_pct ?? 20) / 100) * 800
              const heightPx = ((cz.height_pct ?? 15) / 100) * 1000

              const zoneBoxes = boxes
                .filter(b => b.event_zone_id === zone.id)
                .sort((a, b) => a.numero - b.numero)

              const soldCount = ticketCounts[zone.id] || 0
              const capacity = zone.capacidad || 0
              const percentage = capacity > 0 ? Math.round((soldCount / capacity) * 100) : 0
              const isFull = capacity > 0 && soldCount >= capacity

              return (
                <div
                  key={zone.id}
                  className="absolute"
                  style={{
                    left: xPx,
                    top: yPx,
                    width: widthPx,
                    height: heightPx,
                  }}
                >
                  {/* Zone Label - Outside */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap z-20 pointer-events-none">
                    <span className={`px-2 py-1 rounded text-xs font-bold shadow-sm backdrop-blur-sm select-none border ${isFull ? 'bg-red-900/80 text-red-100 border-red-500' : 'bg-black/80 text-white border-white/20'}`}>
                      {cz.nombre} {isFull && '(AGOTADO)'}
                    </span>
                  </div>

                  {/* Shape Visual */}
                  <div className="w-full h-full relative">
                    {cz.tipo_forma === 'poly' ? (
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                        <polygon
                          points={getPolygonPointsString(cz)}
                          fill={isFull ? "rgba(239, 68, 68, 0.3)" : "rgba(37, 99, 235, 0.2)"}
                          stroke={isFull ? "#ef4444" : "white"}
                          strokeWidth="2"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                    ) : (
                      <div
                        className={`absolute inset-0 border-2 transition-colors ${cz.tipo_forma === 'circle' ? 'rounded-full' : 'rounded-lg'} ${isFull ? 'border-red-500 bg-red-500/20' : 'border-white bg-blue-600/20'}`}
                      />
                    )}

                    {/* Content Overlay */}
                    <div className="absolute inset-0">
                      {cz.es_zona_boxes ? (
                        <div className="relative w-full h-full">
                          {zoneBoxes.map(box => {
                            const isOcupado = box.estado?.toLowerCase() === 'ocupado'
                            const boxX = box.pos_x ?? 0
                            const boxY = box.pos_y ?? 0

                            return (
                              <div
                                key={box.id}
                                className={`absolute w-7 h-7 rounded-full ${isOcupado ? 'bg-red-500' : 'bg-blue-600'} text-white text-[10px] flex items-center justify-center shadow-md transition-colors duration-300`}
                                style={{
                                  left: boxX,
                                  top: boxY,
                                  width: 28,
                                  height: 28
                                }}
                                title={`Box ${box.numero}: ${isOcupado ? 'Ocupado' : 'Disponible'}`}
                              >
                                {box.numero}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center w-full h-full">
                          <div className="flex flex-col items-center justify-center bg-black/40 rounded p-1 backdrop-blur-[1px]">
                            <span className="text-white text-xs font-bold">{soldCount}/{capacity}</span>
                            <div className="w-12 h-1 bg-white/30 rounded-full mt-1 overflow-hidden">
                              <div
                                className={`h-full ${isFull ? 'bg-red-500' : 'bg-blue-400'}`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
