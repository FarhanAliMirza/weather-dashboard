"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import type { DataPoint, Dataset, Polygon } from "@/app/page"

interface MapVisualizationProps {
  data: DataPoint[]
  datasets: Dataset[]
  polygons: Polygon[]
  onAddPolygon: (polygon: Polygon) => void
  isDrawingMode: boolean
}

export function MapVisualization({
  data,
  datasets,
  polygons,
  onAddPolygon,
  isDrawingMode
}: MapVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [currentPolygon, setCurrentPolygon] = useState<{ x: number; y: number }[]>([])
  const [polygonName, setPolygonName] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Convert lat/lng to SVG coordinates
  const latLngToSVG = useCallback((lat: number, lng: number) => {
    const centerLat = 40.7128
    const centerLng = -74.0060
    const scale = 5000
    
    const x = (lng - centerLng) * scale + 400
    const y = (centerLat - lat) * scale + 300
    
    return { x, y }
  }, [])

  // Get color intensity based on value
  const getColorIntensity = useCallback((value: number, dataset: Dataset) => {
    const maxValue = Math.max(...dataset.data.map(d => d.value))
    const minValue = Math.min(...dataset.data.map(d => d.value))
    const intensity = (value - minValue) / (maxValue - minValue)
    return intensity
  }, [])

  const handleSVGClick = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawingMode) return

    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left - pan.x) / zoom
    const y = (event.clientY - rect.top - pan.y) / zoom

    setCurrentPolygon(prev => [...prev, { x, y }])
  }, [isDrawingMode, pan, zoom])

  const handleMouseDown = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    if (isDrawingMode) return
    
    setIsDragging(true)
    setDragStart({
      x: event.clientX - pan.x,
      y: event.clientY - pan.y
    })
  }, [isDrawingMode, pan])

  const handleMouseMove = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging || isDrawingMode) return

    setPan({
      x: event.clientX - dragStart.x,
      y: event.clientY - dragStart.y
    })
  }, [isDragging, isDrawingMode, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const completePolygon = useCallback(() => {
    if (currentPolygon.length < 3) return

    const colors = ["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#feca57"]
    const polygon: Polygon = {
      id: `polygon-${Date.now()}`,
      points: currentPolygon,
      name: polygonName || `Polygon ${polygons.length + 1}`,
      color: colors[polygons.length % colors.length]
    }

    onAddPolygon(polygon)
    setCurrentPolygon([])
    setPolygonName("")
  }, [currentPolygon, polygonName, polygons.length, onAddPolygon])

  const cancelPolygon = useCallback(() => {
    setCurrentPolygon([])
    setPolygonName("")
  }, [])

  const resetView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  return (
    <div className="relative h-full w-full">
      {/* Map Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom(prev => Math.min(prev * 1.2, 3))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom(prev => Math.max(prev / 1.2, 0.5))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={resetView}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        
        {isDrawingMode && (
          <Card className="p-3">
            <div className="space-y-2">
              <Input
                placeholder="Polygon name"
                value={polygonName}
                onChange={(e) => setPolygonName(e.target.value)}
                className="h-8"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={completePolygon} disabled={currentPolygon.length < 3}>
                  Complete
                </Button>
                <Button size="sm" variant="outline" onClick={cancelPolygon}>
                  Cancel
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Points: {currentPolygon.length}
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Map SVG */}
      <svg
        ref={svgRef}
        className="w-full h-full cursor-crosshair"
        style={{ cursor: isDrawingMode ? 'crosshair' : isDragging ? 'grabbing' : 'grab' }}
        onClick={handleSVGClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Background Grid */}
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="800" height="600" fill="url(#grid)" />
          
          {/* Base Map (Simple representation) */}
          <rect x="100" y="100" width="600" height="400" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="2" rx="8" />
          <text x="400" y="300" textAnchor="middle" className="fill-gray-500 text-sm font-medium">
            Map Area (NYC Region)
          </text>
          
          {/* Existing Polygons */}
          {polygons.map((polygon) => (
            <g key={polygon.id}>
              <polygon
                points={polygon.points.map(p => `${p.x},${p.y}`).join(' ')}
                fill={polygon.color}
                fillOpacity="0.3"
                stroke={polygon.color}
                strokeWidth="2"
              />
              <text
                x={polygon.points.reduce((sum, p) => sum + p.x, 0) / polygon.points.length}
                y={polygon.points.reduce((sum, p) => sum + p.y, 0) / polygon.points.length}
                textAnchor="middle"
                className="fill-gray-700 text-xs font-medium"
              >
                {polygon.name}
              </text>
            </g>
          ))}
          
          {/* Current Polygon Being Drawn */}
          {currentPolygon.length > 0 && (
            <g>
              <polyline
                points={currentPolygon.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
              {currentPolygon.map((point, index) => (
                <circle
                  key={index}
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill="#3b82f6"
                />
              ))}
            </g>
          )}
          
          {/* Data Points */}
          {data.map((point) => {
            const { x, y } = latLngToSVG(point.lat, point.lng)
            const dataset = datasets.find(d => d.data.some(dp => dp.id === point.id))
            if (!dataset) return null
            
            const intensity = getColorIntensity(point.value, dataset)
            const radius = 3 + intensity * 5
            
            return (
              <g key={point.id}>
                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  fill={dataset.color}
                  fillOpacity={0.7}
                  stroke="white"
                  strokeWidth="1"
                />
                <title>
                  {`${dataset.name}: ${point.value.toFixed(1)} (${new Date(point.timestamp).toLocaleDateString()})`}
                </title>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
