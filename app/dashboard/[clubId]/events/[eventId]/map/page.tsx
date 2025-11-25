'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { RealtimeChannel } from '@supabase/supabase-js'
import { ZoomIn, ZoomOut, Maximize, Move } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

  // Zoom & Pan State
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const wrapperRef = useRef<HTMLDivElement>(null)

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
          event: '*',
          schema: 'public',
          table: 'boxes',
          filter: `event_zone_id=in.(${zones.map(z => z.id).join(',')})`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updatedBox = payload.new as Box
            setBoxes(prev => prev.map(b =>
              b.id === updatedBox.id
                ? { ...b, ...updatedBox, pos_x: b.pos_x, pos_y: b.pos_y }
                : b
            ))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tickets',
          filter: `event_zone_id=in.(${zones.map(z => z.id).join(',')})`
        },
        (payload) => {
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
        setRealtimeStatus(status)
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [zones, eventId, supabase])

  const testConnection = async () => {
    if (!channelRef.current) {
      alert('Error: No hay canal activo')
      return
    }
    const status = await channelRef.current.send({
      type: 'broadcast',
      event: 'test',
      payload: { message: 'Test connection' },
    })
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

      const boxesWithPos = boxesData.map(box => {
        const zone = zonesList.find(z => z.id === box.event_zone_id)
        if (!zone || !zone.club_zones) return box

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

  const getPolygonPointsString = (zone: ClubZone) => {
    if (zone.puntos && zone.puntos.length > 0) {
      return zone.puntos.map(p => `${p.x},${p.y}`).join(' ')
    }
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

  // Zoom & Pan Handlers
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const scaleAmount = -e.deltaY * 0.001
      const newScale = Math.min(Math.max(0.1, transform.k + scaleAmount), 5)
      setTransform(prev => ({ ...prev, k: newScale }))
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
    setTransform(prev => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    }))
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const zoomIn = () => setTransform(prev => ({ ...prev, k: Math.min(prev.k * 1.2, 5) }))
  const zoomOut = () => setTransform(prev => ({ ...prev, k: Math.max(prev.k / 1.2, 0.1) }))

  const resetTransform = () => {
    if (wrapperRef.current) {
      const parentWidth = wrapperRef.current.clientWidth
      const parentHeight = wrapperRef.current.clientHeight
      const baseWidth = 800
      const baseHeight = 1000

      const scaleX = parentWidth / baseWidth
      const scaleY = parentHeight / baseHeight
      const scale = Math.min(scaleX, scaleY, 1) * 0.9 // 90% fit

      const x = (parentWidth - baseWidth * scale) / 2
      const y = (parentHeight - baseHeight * scale) / 2

      setTransform({ x, y, k: scale })
    } else {
      setTransform({ x: 0, y: 0, k: 1 })
    }
  }

  useEffect(() => {
    // Initial fit
    const timer = setTimeout(resetTransform, 100)
    window.addEventListener('resize', resetTransform)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', resetTransform)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-white">
        <p className="text-lg animate-pulse">Cargando mapa en vivo...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-zinc-950 overflow-hidden">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-white">
            {eventName} <span className="text-zinc-400 font-normal text-sm">({clubName})</span>
          </h1>
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${realtimeStatus === 'SUBSCRIBED' ? 'bg-green-500/20 text-green-400' :
              realtimeStatus === 'CONNECTING' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
            }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${realtimeStatus === 'SUBSCRIBED' ? 'bg-green-500 animate-pulse' : 'bg-current'}`} />
            {realtimeStatus === 'SUBSCRIBED' ? 'EN VIVO' : realtimeStatus}
          </div>
        </div>
      </div>

      {/* Map Canvas Area */}
      <div className="relative flex-1 overflow-hidden bg-zinc-950">
        {/* Floating Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-20 bg-zinc-900/90 backdrop-blur p-2 rounded-lg border border-zinc-800 shadow-xl">
          <Button variant="ghost" size="icon" onClick={zoomIn} className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-800" title="Acercar">
            <ZoomIn size={18} />
          </Button>
          <Button variant="ghost" size="icon" onClick={zoomOut} className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-800" title="Alejar">
            <ZoomOut size={18} />
          </Button>
          <Button variant="ghost" size="icon" onClick={resetTransform} className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-800" title="Restablecer vista">
            <Maximize size={18} />
          </Button>
        </div>

        <div className="absolute bottom-4 left-4 z-20 bg-zinc-900/80 backdrop-blur px-3 py-1.5 rounded-md border border-zinc-800 text-xs text-zinc-400 pointer-events-none">
          <div className="flex items-center gap-2">
            <Move size={12} />
            <span>Arrastra para mover • Rueda para zoom</span>
          </div>
        </div>

        {/* Draggable Area */}
        <div
          ref={wrapperRef}
          className={`w-full h-full cursor-${isDragging ? 'grabbing' : 'grab'} touch-none`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onTouchStart={(e) => {
            if (e.touches.length === 1) {
              setIsDragging(true)
              setDragStart({
                x: e.touches[0].clientX - transform.x,
                y: e.touches[0].clientY - transform.y
              })
            }
          }}
          onTouchMove={(e) => {
            if (!isDragging || e.touches.length !== 1) return
            // Prevent default to stop scrolling the page while dragging map
            // e.preventDefault() // Note: might need passive: false in listener if React doesn't handle it
            setTransform(prev => ({
              ...prev,
              x: e.touches[0].clientX - dragStart.x,
              y: e.touches[0].clientY - dragStart.y
            }))
          }}
          onTouchEnd={() => {
            setIsDragging(false)
          }}
        >
          <div
            ref={containerRef}
            className="absolute origin-top-left shadow-2xl rounded-sm overflow-hidden bg-zinc-900"
            style={{
              width: 800,
              height: 1000,
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
          >
            {bgUrl ? (
              <img
                src={bgUrl}
                alt="Mapa del club"
                className="w-full h-full object-cover pointer-events-none select-none opacity-50"
                draggable={false}
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
                  {/* Zone Label */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap z-10 pointer-events-none">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm backdrop-blur-sm select-none border ${isFull ? 'bg-red-900/80 text-red-100 border-red-500' : 'bg-black/60 text-white border-white/10'}`}>
                      {cz.nombre}
                    </span>
                  </div>

                  {/* Shape Visual */}
                  <div className="w-full h-full relative group">
                    {cz.tipo_forma === 'poly' ? (
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                        <polygon
                          points={getPolygonPointsString(cz)}
                          fill={isFull ? "rgba(239, 68, 68, 0.2)" : "rgba(37, 99, 235, 0.1)"}
                          stroke={isFull ? "#ef4444" : "rgba(255,255,255,0.3)"}
                          strokeWidth="1"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                    ) : (
                      <div
                        className={`absolute inset-0 border transition-colors ${cz.tipo_forma === 'circle' ? 'rounded-full' : 'rounded-sm'} ${isFull ? 'border-red-500 bg-red-500/10' : 'border-white/30 bg-blue-500/10'}`}
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
                                className={`absolute w-5 h-5 rounded-full ${isOcupado ? 'bg-red-500' : 'bg-blue-600 hover:bg-blue-500'} text-white text-[8px] flex items-center justify-center shadow-sm transition-transform hover:scale-125 cursor-pointer`}
                                style={{
                                  left: boxX,
                                  top: boxY,
                                  width: 20,
                                  height: 20
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
                            <span className="text-white text-[10px] font-bold">{soldCount}/{capacity}</span>
                            <div className="w-8 h-1 bg-white/20 rounded-full mt-0.5 overflow-hidden">
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
