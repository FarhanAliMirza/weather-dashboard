"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { MapPin, Layers, Navigation, RotateCcw } from 'lucide-react'
import type { DataPoint, Dataset, Polygon } from "@/app/page"

// Mapbox types (simplified)
interface MapboxMap {
  on: (event: string, callback: (e: any) => void) => void
  off: (event: string, callback: (e: any) => void) => void
  addSource: (id: string, source: any) => void
  addLayer: (layer: any) => void
  removeLayer: (id: string) => void
  removeSource: (id: string) => void
  getSource: (id: string) => any
  flyTo: (options: any) => void
  setLayoutProperty: (layerId: string, property: string, value: any) => void
  setPaintProperty: (layerId: string, property: string, value: any) => void
  getCanvas: () => HTMLCanvasElement
  project: (lngLat: [number, number]) => { x: number; y: number }
  unproject: (point: { x: number; y: number }) => { lng: number; lat: number }
}

interface MapVisualizationProps {
  data: DataPoint[]
  datasets: Dataset[]
  polygons: Polygon[]
  onAddPolygon: (polygon: Polygon) => void
  isDrawingMode: boolean
}

export function MapboxVisualization({
  data,
  datasets,
  polygons,
  onAddPolygon,
  isDrawingMode
}: MapVisualizationProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<MapboxMap | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [currentPolygon, setCurrentPolygon] = useState<[number, number][]>([])
  const [polygonName, setPolygonName] = useState("")
  const [mapStyle, setMapStyle] = useState("streets-v12")
  const [showSatellite, setShowSatellite] = useState(false)

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    // Mock Mapbox GL JS initialization
    const initializeMap = () => {
      // In a real implementation, you would use:
      // import mapboxgl from 'mapbox-gl'
      // mapboxgl.accessToken = 'your-mapbox-token'
      
      const mockMap = {
        on: (event: string, callback: (e: any) => void) => {
          if (event === 'load') {
            setTimeout(() => {
              setMapLoaded(true)
              callback({})
            }, 1000)
          }
          if (event === 'click' && isDrawingMode) {
            mapContainer.current?.addEventListener('click', (e) => {
              const rect = mapContainer.current!.getBoundingClientRect()
              const x = e.clientX - rect.left
              const y = e.clientY - rect.top
              
              // Mock coordinate conversion
              const lng = -74.0060 + (x - rect.width / 2) / rect.width * 0.1
              const lat = 40.7128 + (rect.height / 2 - y) / rect.height * 0.1
              
              callback({ lngLat: { lng, lat } })
            })
          }
        },
        off: () => {},
        addSource: () => {},
        addLayer: () => {},
        removeLayer: () => {},
        removeSource: () => {},
        getSource: () => null,
        flyTo: () => {},
        setLayoutProperty: () => {},
        setPaintProperty: () => {},
        getCanvas: () => mapContainer.current as any,
        project: (lngLat: [number, number]) => ({ x: 0, y: 0 }),
        unproject: (point: { x: number; y: number }) => ({ lng: 0, lat: 0 })
      } as MapboxMap

      map.current = mockMap
      mockMap.on('load', () => {})
    }

    initializeMap()

    return () => {
      map.current = null
    }
  }, [isDrawingMode])

  // Handle map click for polygon drawing
  const handleMapClick = useCallback((e: any) => {
    if (!isDrawingMode) return
    
    const { lng, lat } = e.lngLat
    setCurrentPolygon(prev => [...prev, [lng, lat]])
  }, [isDrawingMode])

  // Complete polygon drawing
  const completePolygon = useCallback(() => {
    if (currentPolygon.length < 3) return

    const colors = ["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#feca57"]
    const polygon: Polygon = {
      id: `polygon-${Date.now()}`,
      coordinates: currentPolygon,
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

  // Update data layers when data changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Remove existing data layers
    datasets.forEach(dataset => {
      try {
        map.current?.removeLayer(`${dataset.id}-layer`)
        map.current?.removeSource(`${dataset.id}-source`)
      } catch (e) {
        // Layer might not exist
      }
    })

    // Add new data layers
    datasets.filter(d => d.enabled).forEach(dataset => {
      const filteredData = data.filter(d => d.category === dataset.id)
      
      if (filteredData.length === 0) return

      const geojsonData = {
        type: 'FeatureCollection',
        features: filteredData.map(point => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [point.lng, point.lat]
          },
          properties: {
            value: point.value,
            category: point.category,
            timestamp: point.timestamp,
            id: point.id
          }
        }))
      }

      map.current?.addSource(`${dataset.id}-source`, {
        type: 'geojson',
        data: geojsonData
      })

      map.current?.addLayer({
        id: `${dataset.id}-layer`,
        type: 'circle',
        source: `${dataset.id}-source`,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'value'],
            0, 4,
            100, 12
          ],
          'circle-color': dataset.color,
          'circle-opacity': 0.8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      })
    })
  }, [data, datasets, mapLoaded])

  // Update polygon layers
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Remove existing polygon layers
    try {
      map.current?.removeLayer('polygons-layer')
      map.current?.removeSource('polygons-source')
    } catch (e) {
      // Layer might not exist
    }

    if (polygons.length === 0) return

    const polygonFeatures = polygons.map(polygon => ({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [polygon.coordinates.concat([polygon.coordinates[0]])] // Close the polygon
      },
      properties: {
        name: polygon.name,
        color: polygon.color,
        id: polygon.id
      }
    }))

    map.current?.addSource('polygons-source', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: polygonFeatures
      }
    })

    map.current?.addLayer({
      id: 'polygons-layer',
      type: 'fill',
      source: 'polygons-source',
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': 0.3
      }
    })

    map.current?.addLayer({
      id: 'polygons-outline',
      type: 'line',
      source: 'polygons-source',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 2
      }
    })
  }, [polygons, mapLoaded])

  // Handle drawing mode
  useEffect(() => {
    if (!map.current) return

    if (isDrawingMode) {
      map.current.on('click', handleMapClick)
    } else {
      map.current.off('click', handleMapClick)
    }

    return () => {
      map.current?.off('click', handleMapClick)
    }
  }, [isDrawingMode, handleMapClick])

  const toggleMapStyle = useCallback(() => {
    setShowSatellite(!showSatellite)
    setMapStyle(showSatellite ? "streets-v12" : "satellite-v9")
  }, [showSatellite])

  const resetView = useCallback(() => {
    map.current?.flyTo({
      center: [-74.0060, 40.7128], // NYC
      zoom: 12,
      duration: 1000
    })
  }, [])

  return (
    <div className="relative h-full w-full">
      {/* Map Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={toggleMapStyle}>
            <Layers className="h-4 w-4 mr-1" />
            {showSatellite ? "Street" : "Satellite"}
          </Button>
          <Button size="sm" variant="outline" onClick={resetView}>
            <Navigation className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
        
        {isDrawingMode && (
          <Card className="p-3 max-w-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="text-sm font-medium">Drawing Mode</span>
              </div>
              <Input
                placeholder="Polygon name"
                value={polygonName}
                onChange={(e) => setPolygonName(e.target.value)}
                className="h-8"
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={completePolygon} 
                  disabled={currentPolygon.length < 3}
                >
                  Complete
                </Button>
                <Button size="sm" variant="outline" onClick={cancelPolygon}>
                  Cancel
                </Button>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Points: {currentPolygon.length}</span>
                <Badge variant="secondary">
                  {currentPolygon.length >= 3 ? "Ready" : "Need " + (3 - currentPolygon.length)}
                </Badge>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Data Info Panel */}
      <div className="absolute top-4 right-4 z-10">
        <Card className="p-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Live Data</span>
            </div>
            <div className="text-xs text-muted-foreground">
              <div>Active Points: {data.length}</div>
              <div>Polygons: {polygons.length}</div>
              <div>Layers: {datasets.filter(d => d.enabled).length}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Loading State */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Mapbox...</p>
            <p className="text-sm text-gray-500 mt-2">
              In production, this would load real Mapbox tiles
            </p>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div 
        ref={mapContainer} 
        className="w-full h-full"
        style={{ 
          cursor: isDrawingMode ? 'crosshair' : 'grab',
          background: mapLoaded ? 'transparent' : '#f3f4f6'
        }}
      >
        {/* Mock Map Display */}
        {mapLoaded && (
          <div className="w-full h-full relative overflow-hidden">
            {/* Mock map tiles background */}
            <div 
              className="absolute inset-0"
              style={{
                backgroundImage: showSatellite 
                  ? 'url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cdefs%3E%3Cpattern id="satellite" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse"%3E%3Crect width="50" height="50" fill="%23e8f5e8"/%3E%3Cpath d="M0 0L50 50M50 0L0 50" stroke="%23c3e6c3" strokeWidth="1"/%3E%3C/pattern%3E%3C/defs%3E%3Crect width="100" height="100" fill="url(%23satellite)"/%3E%3C/svg%3E")'
                  : 'url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cdefs%3E%3Cpattern id="streets" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse"%3E%3Crect width="50" height="50" fill="%23f8f9fa"/%3E%3Cpath d="M0 25L50 25M25 0L25 50" stroke="%23e9ecef" strokeWidth="1"/%3E%3C/pattern%3E%3C/defs%3E%3Crect width="100" height="100" fill="url(%23streets)"/%3E%3C/svg%3E")',
                backgroundSize: '100px 100px'
              }}
            />
            
            {/* NYC landmarks overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-600">
                <div className="text-lg font-semibold mb-2">New York City</div>
                <div className="text-sm">
                  {showSatellite ? "Satellite View" : "Street View"}
                </div>
                <div className="text-xs mt-2 opacity-75">
                  Real Mapbox integration would show actual map tiles here
                </div>
              </div>
            </div>

            {/* Mock data points visualization */}
            {data.map((point, index) => {
              const dataset = datasets.find(d => d.data.some(dp => dp.id === point.id))
              if (!dataset || !dataset.enabled) return null

              // Mock positioning based on lat/lng
              const x = ((point.lng + 74.0060) / 0.1) * 100
              const y = ((40.7128 - point.lat) / 0.1) * 100

              return (
                <div
                  key={point.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{
                    left: `${Math.max(0, Math.min(100, x))}%`,
                    top: `${Math.max(0, Math.min(100, y))}%`
                  }}
                >
                  <div
                    className="rounded-full border-2 border-white shadow-lg"
                    style={{
                      backgroundColor: dataset.color,
                      width: `${8 + (point.value / 100) * 12}px`,
                      height: `${8 + (point.value / 100) * 12}px`,
                      opacity: 0.8
                    }}
                    title={`${dataset.name}: ${point.value.toFixed(1)}`}
                  />
                </div>
              )
            })}

            {/* Current polygon being drawn */}
            {currentPolygon.length > 0 && (
              <svg className="absolute inset-0 pointer-events-none">
                <polyline
                  points={currentPolygon.map(([lng, lat]) => {
                    const x = ((lng + 74.0060) / 0.1) * 100
                    const y = ((40.7128 - lat) / 0.1) * 100
                    return `${x}%,${y}%`
                  }).join(' ')}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />
                {currentPolygon.map(([lng, lat], index) => {
                  const x = ((lng + 74.0060) / 0.1) * 100
                  const y = ((40.7128 - lat) / 0.1) * 100
                  return (
                    <circle
                      key={index}
                      cx={`${x}%`}
                      cy={`${y}%`}
                      r="4"
                      fill="#3b82f6"
                    />
                  )
                })}
              </svg>
            )}

            {/* Existing polygons */}
            {polygons.map((polygon) => (
              <svg key={polygon.id} className="absolute inset-0 pointer-events-none">
                <polygon
                  points={polygon.coordinates.map(([lng, lat]) => {
                    const x = ((lng + 74.0060) / 0.1) * 100
                    const y = ((40.7128 - lat) / 0.1) * 100
                    return `${x}%,${y}%`
                  }).join(' ')}
                  fill={polygon.color}
                  fillOpacity="0.3"
                  stroke={polygon.color}
                  strokeWidth="2"
                />
              </svg>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
