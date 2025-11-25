'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Rnd } from 'react-rnd'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Save, Layout, PenTool, Trash2, ZoomIn, ZoomOut, Maximize, Move, Menu, X, ChevronLeft } from 'lucide-react'

// Constants
const BOX_VISUAL_SIZE = 28

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
  cantidad_boxes: number | null
  es_zona_boxes: boolean | null
  tipo_forma: 'rect' | 'circle' | 'poly' | null
  lados: number | null
  puntos: Point[] | null
}

interface ZoneBox {
  id: string
  club_zone_id: string
  numero_box: number
  orden: number | null
  pos_x: number | null
  pos_y: number | null
}

export default function MapEditorPage() {
  const params = useParams()
  const clubId = params?.clubId as string

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // State
  const [bgUrl, setBgUrl] = useState('')
  const [zones, setZones] = useState<ClubZone[]>([])
  const [zoneBoxes, setZoneBoxes] = useState<ZoneBox[]>([])
  const [editingZones, setEditingZones] = useState<Record<string, boolean>>({})
  const [editingShape, setEditingShape] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  // Create Zone Form State
  const [newZoneName, setNewZoneName] = useState('')
  const [newZoneIsBox, setNewZoneIsBox] = useState(false)
  const [newZoneShape, setNewZoneShape] = useState<'rect' | 'circle' | 'poly'>('rect')
  const [newZoneSides, setNewZoneSides] = useState(5)
  const [newZoneBoxCount, setNewZoneBoxCount] = useState(10)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const draggingPointsRef = useRef<Point[] | null>(null)

  // Zoom & Pan State
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 })
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const wrapperRef = useRef<HTMLDivElement>(null)
  const lastPinchDistance = useRef<number | null>(null)

  useEffect(() => {
    if (!clubId) return
    void loadData()
  }, [clubId])

  const loadData = async () => {
    setLoading(true)

    const { data: clubData } = await supabase
      .from('clubs')
      .select('id, map_background_url')
      .eq('id', clubId)
      .single()

    if (clubData) setBgUrl(clubData.map_background_url ?? '')

    const { data: zonesData } = await supabase
      .from('club_zones')
      .select('*')
      .eq('club_id', clubId)

    const zoneList = (zonesData as ClubZone[]) ?? []
    setZones(zoneList)

    if (zoneList.length > 0) {
      const zoneIds = zoneList.map(z => z.id)
      const { data: boxesData } = await supabase
        .from('club_zone_boxes')
        .select('*')
        .in('club_zone_id', zoneIds)

      setZoneBoxes((boxesData as ZoneBox[]) ?? [])
    } else {
      setZoneBoxes([])
    }

    setLoading(false)
  }

  const saveBackgroundUrl = async () => {
    await supabase
      .from('clubs')
      .update({ map_background_url: bgUrl })
      .eq('id', clubId)
    alert('Fondo actualizado')
  }

  const clearBackground = async () => {
    setBgUrl('')
    await supabase
      .from('clubs')
      .update({ map_background_url: null })
      .eq('id', clubId)
  }

  const createZone = async () => {
    try {
      let initialPoints: Point[] | null = null
      if (newZoneShape === 'poly' && newZoneSides) {
        initialPoints = []
        for (let i = 0; i < newZoneSides; i++) {
          const angle = (2 * Math.PI * i) / newZoneSides - Math.PI / 2
          const x = 50 + 50 * Math.cos(angle)
          const y = 50 + 50 * Math.sin(angle)
          initialPoints.push({ x, y })
        }
      }

      const { data: zoneData, error: zoneError } = await supabase
        .from('club_zones')
        .insert({
          club_id: clubId,
          nombre: newZoneName,
          es_zona_boxes: newZoneIsBox,
          tipo_forma: newZoneShape,
          lados: newZoneShape === 'poly' ? newZoneSides : null,
          puntos: initialPoints,
          cantidad_boxes: newZoneIsBox ? newZoneBoxCount : 0,
          pos_x: 10,
          pos_y: 10,
          width_pct: 20,
          height_pct: 15
        })
        .select()
        .single()

      if (zoneError) throw zoneError
      if (!zoneData) throw new Error('No data returned')

      const newZone = zoneData as ClubZone
      setZones(prev => [...prev, newZone])

      if (newZoneIsBox && newZoneBoxCount > 0) {
        const boxesToCreate = Array.from({ length: newZoneBoxCount }).map((_, i) => ({
          club_zone_id: newZone.id,
          numero_box: i + 1,
          orden: i + 1,
          pos_x: (i % 5) * 35 + 10,
          pos_y: Math.floor(i / 5) * 35 + 10
        }))

        const { data: boxesData, error: boxesError } = await supabase
          .from('club_zone_boxes')
          .insert(boxesToCreate)
          .select()

        if (boxesError) throw boxesError
        if (boxesData) {
          setZoneBoxes(prev => [...prev, ...(boxesData as ZoneBox[])])
        }
      }

      setIsCreateDialogOpen(false)
      setNewZoneName('')
      setNewZoneIsBox(false)
      setNewZoneShape('rect')
      setNewZoneBoxCount(10)

    } catch (error) {
      console.error('Error creating zone:', error)
      alert('Error al crear la zona')
    }
  }

  async function saveZone(zone: ClubZone, update: Partial<ClubZone>) {
    const newZone = { ...zone, ...update }
    setZones(prev => prev.map(z => (z.id === zone.id ? newZone : z)))

    await supabase
      .from('club_zones')
      .update({
        pos_x: newZone.pos_x,
        pos_y: newZone.pos_y,
        width_pct: newZone.width_pct,
        height_pct: newZone.height_pct,
        puntos: newZone.puntos
      })
      .eq('id', zone.id)
  }

  async function saveBoxPosition(boxId: string, x: number, y: number) {
    setZoneBoxes(prev => prev.map(b => b.id === boxId ? { ...b, pos_x: x, pos_y: y } : b))
    await supabase
      .from('club_zone_boxes')
      .update({ pos_x: x, pos_y: y })
      .eq('id', boxId)
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
      const rect = wrapperRef.current?.getBoundingClientRect()
      if (!rect) return

      const scaleAmount = -e.deltaY * 0.001
      const newScale = Math.min(Math.max(0.1, transform.k + scaleAmount), 5)

      const scaleRatio = newScale / transform.k
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const newX = mouseX - (mouseX - transform.x) * scaleRatio
      const newY = mouseY - (mouseY - transform.y) * scaleRatio

      setTransform({ x: newX, y: newY, k: newScale })
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === wrapperRef.current || e.target === containerRef.current) {
      setIsDraggingCanvas(true)
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingCanvas) return
    e.preventDefault()
    setTransform(prev => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    }))
  }

  const handleMouseUp = () => {
    setIsDraggingCanvas(false)
  }

  const zoomIn = () => {
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (!rect) return

    const newScale = Math.min(transform.k * 1.2, 5)
    const scaleRatio = newScale / transform.k
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const newX = centerX - (centerX - transform.x) * scaleRatio
    const newY = centerY - (centerY - transform.y) * scaleRatio

    setTransform({ x: newX, y: newY, k: newScale })
  }

  const zoomOut = () => {
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (!rect) return

    const newScale = Math.max(transform.k / 1.2, 0.1)
    const scaleRatio = newScale / transform.k
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const newX = centerX - (centerX - transform.x) * scaleRatio
    const newY = centerY - (centerY - transform.y) * scaleRatio

    setTransform({ x: newX, y: newY, k: newScale })
  }

  const resetTransform = () => {
    if (wrapperRef.current) {
      const parentWidth = wrapperRef.current.clientWidth
      const parentHeight = wrapperRef.current.clientHeight
      const baseWidth = 800
      const baseHeight = 1000

      const scaleX = parentWidth / baseWidth
      const scaleY = parentHeight / baseHeight
      const scale = Math.min(scaleX, scaleY, 1) * 0.9

      const x = (parentWidth - baseWidth * scale) / 2
      const y = (parentHeight - baseHeight * scale) / 2

      setTransform({ x, y, k: scale })
    } else {
      setTransform({ x: 0, y: 0, k: 1 })
    }
  }

  useEffect(() => {
    const timer = setTimeout(resetTransform, 100)
    window.addEventListener('resize', resetTransform)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', resetTransform)
    }
  }, [])

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">Cargando editor...</div>
  }

  const containerWidth = 800
  const containerHeight = 1000

  return (
    <div className="relative h-screen bg-zinc-950 overflow-hidden text-white">
      {/* Floating Sidebar Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`absolute top-4 left-4 z-50 bg-zinc-900/80 backdrop-blur border border-zinc-800 text-white hover:bg-zinc-800 transition-all ${isSidebarOpen ? 'left-[336px]' : 'left-4'}`}
      >
        {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
      </Button>

      {/* Floating Sidebar */}
      <div
        className={`absolute top-0 left-0 h-full w-80 bg-zinc-900/95 backdrop-blur border-r border-zinc-800 p-4 flex flex-col gap-6 overflow-y-auto z-40 shadow-2xl transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="mt-12"> {/* Spacing for the close button area if needed, or just top margin */}
          <h1 className="text-xl font-bold flex items-center gap-2 text-white">
            <Layout className="w-5 h-5" />
            Editor de Mapa
          </h1>
          <p className="text-sm text-zinc-400">Configura las zonas y mesas</p>
        </div>

        <div className="space-y-3">
          <Label className="text-zinc-300">Fondo del Mapa</Label>
          <div className="flex gap-2">
            <Input
              value={bgUrl}
              onChange={e => setBgUrl(e.target.value)}
              placeholder="URL de imagen..."
              className="text-xs bg-zinc-800 border-zinc-700 text-white"
            />
            <Button size="icon" variant="outline" onClick={saveBackgroundUrl} title="Guardar" className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white">
              <Save className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="destructive" onClick={clearBackground} title="Quitar fondo">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-zinc-300">Zonas</Label>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1 bg-purple-600 hover:bg-purple-700 text-white border-none">
                  <Plus className="w-4 h-4" /> Nueva
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                <DialogHeader>
                  <DialogTitle>Crear Nueva Zona</DialogTitle>
                  <DialogDescription className="text-zinc-400">Define las propiedades de la zona.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Nombre</Label>
                    <Input
                      value={newZoneName}
                      onChange={e => setNewZoneName(e.target.value)}
                      placeholder="Ej. Zona VIP"
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>¿Es zona de boxes/mesas?</Label>
                    <Switch
                      checked={newZoneIsBox}
                      onCheckedChange={setNewZoneIsBox}
                    />
                  </div>

                  {newZoneIsBox && (
                    <div className="grid gap-2">
                      <Label>Cantidad de Boxes</Label>
                      <Input
                        type="number"
                        value={newZoneBoxCount}
                        onChange={e => setNewZoneBoxCount(Number(e.target.value))}
                        className="bg-zinc-800 border-zinc-700"
                      />
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label>Forma</Label>
                    <Select
                      value={newZoneShape}
                      onValueChange={(v: any) => setNewZoneShape(v)}
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectItem value="rect">Rectángulo</SelectItem>
                        <SelectItem value="circle">Círculo</SelectItem>
                        <SelectItem value="poly">Polígono</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {newZoneShape === 'poly' && (
                    <div className="grid gap-2">
                      <Label>Número de Lados</Label>
                      <Input
                        type="number"
                        min={3}
                        value={newZoneSides}
                        onChange={e => setNewZoneSides(Number(e.target.value))}
                        className="bg-zinc-800 border-zinc-700"
                      />
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button onClick={createZone} className="bg-purple-600 hover:bg-purple-700">Crear Zona</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {zones.map(zone => (
              <div key={zone.id} className="flex flex-col gap-2 p-3 border border-zinc-800 rounded bg-zinc-800/50 text-sm hover:bg-zinc-800 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-200">{zone.nombre}</span>
                  <div className="flex gap-1">
                    {zone.tipo_forma === 'poly' && (
                      <Button
                        size="icon"
                        variant={editingShape[zone.id] ? "default" : "ghost"}
                        className={`h-7 w-7 ${editingShape[zone.id] ? 'bg-purple-600 hover:bg-purple-700' : 'hover:bg-zinc-700 text-zinc-400'}`}
                        onClick={() => {
                          const isEditing = !editingShape[zone.id]
                          setEditingShape(prev => ({ ...prev, [zone.id]: isEditing }))

                          if (isEditing && (!zone.puntos || zone.puntos.length === 0)) {
                            const sides = zone.lados || 4
                            const newPoints = []
                            for (let i = 0; i < sides; i++) {
                              const angle = (2 * Math.PI * i) / sides - Math.PI / 2
                              const x = 50 + 50 * Math.cos(angle)
                              const y = 50 + 50 * Math.sin(angle)
                              newPoints.push({ x, y })
                            }
                            saveZone(zone, { puntos: newPoints })
                          }
                        }}
                        title="Editar Forma"
                      >
                        <PenTool className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {zone.es_zona_boxes && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500">Boxes</span>
                        <Switch
                          checked={editingZones[zone.id] || false}
                          onCheckedChange={(checked) => setEditingZones(prev => ({ ...prev, [zone.id]: checked }))}
                          aria-label="Editar boxes"
                          className="scale-75"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map Canvas Area - Full Screen */}
      <div className="absolute inset-0 overflow-hidden bg-zinc-950">
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
            <span>Arrastra el fondo para mover • Rueda para zoom</span>
          </div>
        </div>

        {/* Draggable Area */}
        <div
          ref={wrapperRef}
          className={`w-full h-full cursor-${isDraggingCanvas ? 'grabbing' : 'grab'} touch-none`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onTouchStart={(e) => {
            if (e.touches.length === 1) {
              setIsDraggingCanvas(true)
              setDragStart({
                x: e.touches[0].clientX - transform.x,
                y: e.touches[0].clientY - transform.y
              })
            } else if (e.touches.length === 2) {
              setIsDraggingCanvas(false)
              const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
              )
              lastPinchDistance.current = dist
            }
          }}
          onTouchMove={(e) => {
            if (e.touches.length === 1 && isDraggingCanvas) {
              setTransform(prev => ({
                ...prev,
                x: e.touches[0].clientX - dragStart.x,
                y: e.touches[0].clientY - dragStart.y
              }))
            } else if (e.touches.length === 2 && lastPinchDistance.current !== null) {
              const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
              )

              const rect = wrapperRef.current?.getBoundingClientRect()
              if (!rect) return

              const delta = dist - lastPinchDistance.current
              const scaleAmount = delta * 0.01 // Sensitivity factor
              const newScale = Math.min(Math.max(0.1, transform.k + scaleAmount), 5)

              const scaleRatio = newScale / transform.k

              // Calculate center of pinch
              const centerX = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left
              const centerY = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top

              const newX = centerX - (centerX - transform.x) * scaleRatio
              const newY = centerY - (centerY - transform.y) * scaleRatio

              setTransform({ x: newX, y: newY, k: newScale })

              lastPinchDistance.current = dist
            }
          }}
          onTouchEnd={() => {
            setIsDraggingCanvas(false)
            lastPinchDistance.current = null
          }}
        >
          <div
            ref={containerRef}
            className="absolute origin-top-left shadow-2xl rounded-sm overflow-hidden bg-zinc-900"
            style={{
              width: 800,
              height: 1000,
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
              transition: isDraggingCanvas ? 'none' : 'transform 0.1s ease-out'
            }}
          >
            {bgUrl ? (
              <img
                src={bgUrl}
                alt="Mapa"
                className="w-full h-full object-cover pointer-events-none select-none opacity-50 hover:opacity-100 transition-opacity duration-300"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-700">
                <span className="text-sm">Sin imagen de fondo</span>
              </div>
            )}

            {zones.map(zone => {
              const xPx = ((zone.pos_x ?? 0) / 100) * containerWidth
              const yPx = ((zone.pos_y ?? 0) / 100) * containerHeight
              const widthPx = ((zone.width_pct ?? 20) / 100) * containerWidth
              const heightPx = ((zone.height_pct ?? 15) / 100) * containerHeight

              const isEditingBoxes = editingZones[zone.id]
              const isEditingShape = editingShape[zone.id]

              return (
                <Rnd
                  key={zone.id}
                  bounds="parent"
                  size={{ width: widthPx, height: heightPx }}
                  position={{ x: xPx, y: yPx }}
                  scale={transform.k}
                  dragHandleClassName="zone-handle"
                  disableDragging={isEditingBoxes || isEditingShape}
                  enableResizing={!isEditingShape}
                  onDragStop={(_, d) => {
                    saveZone(zone, {
                      pos_x: (d.x / containerWidth) * 100,
                      pos_y: (d.y / containerHeight) * 100
                    })
                  }}
                  onResizeStop={(_, __, ref, ___, pos) => {
                    saveZone(zone, {
                      width_pct: (ref.offsetWidth / containerWidth) * 100,
                      height_pct: (ref.offsetHeight / containerHeight) * 100,
                      pos_x: (pos.x / containerWidth) * 100,
                      pos_y: (pos.y / containerHeight) * 100
                    })
                  }}
                  className={`group ${isEditingBoxes || isEditingShape ? 'z-50' : 'z-10'}`}
                >
                  <div className="w-full h-full relative">
                    {/* Zone Label */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap z-50 pointer-events-none">
                      <span className="bg-black/80 text-white px-2 py-1 rounded text-xs font-bold shadow-sm backdrop-blur-sm select-none border border-white/20">
                        {zone.nombre}
                      </span>
                    </div>

                    {/* Shape Visual */}
                    {zone.tipo_forma === 'poly' ? (
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                        <polygon
                          points={getPolygonPointsString(zone)}
                          fill="rgba(37, 99, 235, 0.2)"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                          className="pointer-events-auto cursor-move zone-handle hover:fill-blue-600/30 transition-colors"
                        />
                      </svg>
                    ) : (
                      <div
                        className={`absolute inset-0 border-2 border-white bg-blue-600/20 hover:bg-blue-600/30 transition-colors cursor-move zone-handle ${zone.tipo_forma === 'circle' ? 'rounded-full' : 'rounded-lg'}`}
                      />
                    )}

                    {/* Polygon Vertex Editors */}
                    {isEditingShape && zone.tipo_forma === 'poly' && (
                      <>
                        <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none z-40">
                          {(zone.puntos || []).map((point, idx) => {
                            const nextIdx = (idx + 1) % (zone.puntos?.length || 0)
                            const nextPoint = zone.puntos![nextIdx]

                            return (
                              <g key={`edge-${idx}`}>
                                <line
                                  x1={`${point.x}%`}
                                  y1={`${point.y}%`}
                                  x2={`${nextPoint.x}%`}
                                  y2={`${nextPoint.y}%`}
                                  stroke="transparent"
                                  strokeWidth="10"
                                  className="cursor-copy pointer-events-auto"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const newPoints = [...(zone.puntos || [])]
                                    const midX = (point.x + nextPoint.x) / 2
                                    const midY = (point.y + nextPoint.y) / 2
                                    newPoints.splice(nextIdx === 0 ? newPoints.length : nextIdx, 0, { x: midX, y: midY })
                                    saveZone(zone, { puntos: newPoints })
                                  }}
                                >
                                  <title>Click para añadir punto</title>
                                </line>
                                <line
                                  x1={`${point.x}%`}
                                  y1={`${point.y}%`}
                                  x2={`${nextPoint.x}%`}
                                  y2={`${nextPoint.y}%`}
                                  stroke="blue"
                                  strokeWidth="2"
                                  strokeDasharray="4"
                                  className="pointer-events-none opacity-50"
                                />
                              </g>
                            )
                          })}
                        </svg>

                        {(zone.puntos || []).map((point, idx) => (
                          <div
                            key={idx}
                            className="absolute w-3 h-3 bg-white border-2 border-purple-600 rounded-full -ml-1.5 -mt-1.5 cursor-crosshair pointer-events-auto hover:scale-150 transition-transform shadow-sm z-50"
                            style={{ left: `${point.x}%`, top: `${point.y}%` }}
                            onMouseDown={(e) => {
                              e.stopPropagation()
                              e.preventDefault()

                              const startX = e.clientX
                              const startY = e.clientY
                              const startPointX = point.x
                              const startPointY = point.y

                              draggingPointsRef.current = [...(zone.puntos || [])]

                              const onMouseMove = (moveEvent: MouseEvent) => {
                                const deltaX = (moveEvent.clientX - startX) / transform.k
                                const deltaY = (moveEvent.clientY - startY) / transform.k

                                const deltaXPct = (deltaX / widthPx) * 100
                                const deltaYPct = (deltaY / heightPx) * 100

                                const newX = Math.max(0, Math.min(100, startPointX + deltaXPct))
                                const newY = Math.max(0, Math.min(100, startPointY + deltaYPct))

                                if (draggingPointsRef.current) {
                                  const newPoints = [...draggingPointsRef.current]
                                  newPoints[idx] = { x: newX, y: newY }
                                  draggingPointsRef.current = newPoints
                                  setZones(prev => prev.map(z => z.id === zone.id ? { ...z, puntos: newPoints } : z))
                                }
                              }

                              const onMouseUp = () => {
                                document.removeEventListener('mousemove', onMouseMove)
                                document.removeEventListener('mouseup', onMouseUp)
                                if (draggingPointsRef.current) {
                                  saveZone(zone, { puntos: draggingPointsRef.current })
                                  draggingPointsRef.current = null
                                }
                              }

                              document.addEventListener('mousemove', onMouseMove)
                              document.addEventListener('mouseup', onMouseUp)
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation()
                              if ((zone.puntos?.length || 0) > 3) {
                                const newPoints = [...(zone.puntos || [])]
                                newPoints.splice(idx, 1)
                                saveZone(zone, { puntos: newPoints })
                              } else {
                                alert('Un polígono debe tener al menos 3 lados.')
                              }
                            }}
                          />
                        ))}
                      </>
                    )}

                    {/* Boxes Container */}
                    {zone.es_zona_boxes && (
                      <div className="absolute inset-0 pointer-events-none">
                        {zoneBoxes.filter(b => b.club_zone_id === zone.id).map(box => {
                          const boxX = box.pos_x ?? 0
                          const boxY = box.pos_y ?? 0

                          if (isEditingBoxes) {
                            return (
                              <Rnd
                                key={box.id}
                                bounds="parent"
                                size={{ width: BOX_VISUAL_SIZE, height: BOX_VISUAL_SIZE }}
                                position={{ x: boxX, y: boxY }}
                                scale={transform.k}
                                onDragStop={(_, d) => saveBoxPosition(box.id, d.x, d.y)}
                                enableResizing={false}
                                className="z-50 pointer-events-auto"
                              >
                                <div className="w-full h-full rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center shadow-md cursor-move hover:scale-110 transition-transform border border-white/20">
                                  {box.numero_box}
                                </div>
                              </Rnd>
                            )
                          } else {
                            return (
                              <div
                                key={box.id}
                                className="absolute w-7 h-7 rounded-full bg-blue-600/80 text-white text-[10px] flex items-center justify-center shadow-sm pointer-events-auto border border-white/10"
                                style={{ left: boxX, top: boxY, width: BOX_VISUAL_SIZE, height: BOX_VISUAL_SIZE }}
                              >
                                {box.numero_box}
                              </div>
                            )
                          }
                        })}
                      </div>
                    )}
                  </div>
                </Rnd>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}