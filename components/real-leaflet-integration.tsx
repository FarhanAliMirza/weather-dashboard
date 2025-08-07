"use client"

// This file shows how to implement real Leaflet integration
// Uncomment and modify when you want to use actual Leaflet

/*
import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default markers in Leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})

interface RealLeafletProps {
  data: DataPoint[]
  datasets: Dataset[]
  polygons: Polygon[]
  onAddPolygon: (polygon: Polygon) => void
  isDrawingMode: boolean
}

export function RealLeafletIntegration({
  data,
  datasets,
  polygons,
  onAddPolygon,
  isDrawingMode
}: RealLeafletProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const dataLayers = useRef<L.LayerGroup[]>([])
  const polygonLayers = useRef<L.Polygon[]>([])
  const currentPolygonPoints = useRef<L.LatLng[]>([])
  const currentPolyline = useRef<L.Polyline | null>(null)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    // Initialize Leaflet map
    map.current = L.map(mapContainer.current).setView([40.7128, -74.0060], 12)

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map.current)

    // Alternative tile layers
    const tileLayers = {
      osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }),
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri'
      }),
      topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenTopoMap contributors'
      }),
      dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© CartoDB'
      })
    }

    // Add layer control
    L.control.layers(tileLayers).addTo(map.current)

    setMapLoaded(true)

    return () => {
      map.current?.remove()
    }
  }, [])

  // Handle drawing mode
  useEffect(() => {
    if (!map.current) return

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (!isDrawingMode) return

      currentPolygonPoints.current.push(e.latlng)

      // Remove previous polyline
      if (currentPolyline.current) {
        map.current?.removeLayer(currentPolyline.current)
      }

      // Add new polyline
      if (currentPolygonPoints.current.length > 1) {
        currentPolyline.current = L.polyline(currentPolygonPoints.current, {
          color: '#3b82f6',
          dashArray: '5, 5'
        }).addTo(map.current!)
      }
    }

    if (isDrawingMode) {
      map.current.on('click', handleMapClick)
    } else {
      map.current.off('click', handleMapClick)
      // Clear current drawing
      if (currentPolyline.current) {
        map.current.removeLayer(currentPolyline.current)
        currentPolyline.current = null
      }
      currentPolygonPoints.current = []
    }

    return () => {
      map.current?.off('click', handleMapClick)
    }
  }, [isDrawingMode])

  // Update data layers
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Remove existing data layers
    dataLayers.current.forEach(layer => {
      map.current?.removeLayer(layer)
    })
    dataLayers.current = []

    // Add new data layers
    datasets.filter(d => d.enabled).forEach(dataset => {
      const filteredData = data.filter(d => d.category === dataset.id)
      if (filteredData.length === 0) return

      const layerGroup = L.layerGroup()

      filteredData.forEach(point => {
        const intensity = point.value / 100
        const radius = 5 + intensity * 15

        const circle = L.circleMarker([point.lat, point.lng], {
          radius: radius,
          fillColor: dataset.color,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        })

        circle.bindPopup(`
          <div>
            <h3>${dataset.name}</h3>
            <p>Value: ${point.value.toFixed(1)}</p>
            <p>Time: ${new Date(point.timestamp).toLocaleString()}</p>
          </div>
        `)

        layerGroup.addLayer(circle)
      })

      layerGroup.addTo(map.current!)
      dataLayers.current.push(layerGroup)
    })
  }, [data, datasets, mapLoaded])

  // Update polygon layers
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Remove existing polygon layers
    polygonLayers.current.forEach(layer => {
      map.current?.removeLayer(layer)
    })
    polygonLayers.current = []

    // Add polygon layers
    polygons.forEach(polygon => {
      const leafletPolygon = L.polygon(polygon.coordinates, {
        color: polygon.color,
        fillColor: polygon.color,
        fillOpacity: 0.3,
        weight: 2
      })

      leafletPolygon.bindPopup(`<h3>${polygon.name}</h3>`)
      leafletPolygon.addTo(map.current!)
      polygonLayers.current.push(leafletPolygon)
    })
  }, [polygons, mapLoaded])

  const completePolygon = useCallback(() => {
    if (currentPolygonPoints.current.length < 3) return

    const coordinates: [number, number][] = currentPolygonPoints.current.map(
      point => [point.lat, point.lng]
    )

    const colors = ["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#feca57"]
    const polygon = {
      id: `polygon-${Date.now()}`,
      coordinates,
      name: `Polygon ${polygons.length + 1}`,
      color: colors[polygons.length % colors.length]
    }

    onAddPolygon(polygon)

    // Clear current drawing
    if (currentPolyline.current) {
      map.current?.removeLayer(currentPolyline.current)
      currentPolyline.current = null
    }
    currentPolygonPoints.current = []
  }, [polygons.length, onAddPolygon])

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="w-full h-full" />
      
      {isDrawingMode && (
        <div className="absolute top-4 left-4 z-[1000] bg-white p-3 rounded-lg shadow-lg">
          <div className="space-y-2">
            <p className="text-sm font-medium">Drawing Mode Active</p>
            <p className="text-xs text-gray-600">
              Points: {currentPolygonPoints.current.length}
            </p>
            <button
              onClick={completePolygon}
              disabled={currentPolygonPoints.current.length < 3}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm disabled:opacity-50"
            >
              Complete Polygon
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
*/

// Placeholder component for documentation
export function RealLeafletIntegration() {
  return (
    <div className="flex items-center justify-center h-full bg-gray-50">
      <div className="text-center p-8">
        <h3 className="text-lg font-semibold mb-2">Real Leaflet Integration</h3>
        <p className="text-gray-600 mb-4">
          Uncomment the code above to enable real OpenStreetMap integration with Leaflet
        </p>
        <div className="bg-gray-100 p-4 rounded-lg text-left">
          <code className="text-sm">
            npm install leaflet @types/leaflet
          </code>
        </div>
      </div>
    </div>
  )
}
