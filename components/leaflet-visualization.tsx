"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { MapPin, Layers, Navigation, ZoomIn, ZoomOut, Square, RotateCcw } from 'lucide-react'
import { saveToStorage } from "@/lib/storage"
import type { WeatherPolygon, ColorRule } from "@/app/page"

// Dynamic import for Leaflet to avoid SSR issues
let L: any = null

interface LeafletVisualizationProps {
  polygons: WeatherPolygon[]
  onAddPolygon: (polygon: Omit<WeatherPolygon, 'weatherData'>) => void
  isDrawingMode: boolean
  colorRules: ColorRule[]
  selectedDataSource: 'temperature' | 'humidity' | 'windSpeed' | 'precipitation'
  data: any[] // Legacy prop - not used
  datasets: any[] // Legacy prop - not used
  mapView: { center: [number, number]; zoom: number }
  onMapViewChange: (view: { center: [number, number]; zoom: number }) => void
}

export function LeafletVisualization({
  polygons,
  onAddPolygon,
  isDrawingMode,
  colorRules,
  selectedDataSource,
  mapView,
  onMapViewChange
}: LeafletVisualizationProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const [currentPolygon, setCurrentPolygon] = useState<[number, number][]>([])
  const [polygonName, setPolygonName] = useState("")
  const [mapStyle, setMapStyle] = useState("osm")
  const [isMobile, setIsMobile] = useState(false)
  const polygonLayerGroup = useRef<any>(null)
  const currentPolyline = useRef<any>(null)
  const tileLayers = useRef<any>({})
  const mapClickHandler = useRef<any>(null)
  const isDestroyed = useRef(false)

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Load Leaflet CSS and JS
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if Leaflet is already loaded
    if ((window as any).L) {
      L = (window as any).L
      setLeafletLoaded(true)
      return
    }

    // Add Leaflet CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
    link.crossOrigin = ''
    
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      document.head.appendChild(link)
    }

    // Load Leaflet JS
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='
    script.crossOrigin = ''
    script.onload = () => {
      L = (window as any).L
      
      // Fix for default markers
      if (L && L.Icon && L.Icon.Default) {
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        })
      }
      
      setLeafletLoaded(true)
    }
    script.onerror = () => {
      console.error('Failed to load Leaflet')
    }
    
    if (!document.querySelector('script[src*="leaflet.js"]')) {
      document.head.appendChild(script)
    }

    return () => {
      // Don't remove scripts on cleanup as they might be used by other components
    }
  }, [])

  // Initialize Leaflet map
  useEffect(() => {
    if (!leafletLoaded || !mapContainer.current || map.current || !L || isDestroyed.current) return

    // Ensure container is properly mounted
    const container = mapContainer.current
    if (!container || !container.offsetParent) {
      console.warn('Map container not ready, retrying...')
      const retryTimer = setTimeout(() => {
        // Force re-render by updating a state
        setMapLoaded(false)
      }, 100)
      return () => clearTimeout(retryTimer)
    }

    try {
      // Clear any existing Leaflet instance on this container
      if ((container as any)._leaflet_id) {
        delete (container as any)._leaflet_id
      }

      // Initialize map with responsive zoom settings
      map.current = L.map(container, {
        center: mapView.center,
        zoom: mapView.zoom,
        zoomControl: false,
        attributionControl: true,
        minZoom: isMobile ? 3 : 5,
        maxZoom: 18,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
        dragging: true,
        touchZoom: isMobile,
        preferCanvas: false,
        renderer: L.svg()
      })

      // Verify map was created successfully
      if (!map.current) {
        throw new Error('Failed to create Leaflet map instance')
      }

      // Add custom zoom control
      L.control.zoom({
        position: isMobile ? 'bottomright' : 'topleft'
      }).addTo(map.current)

      // Create layer group for polygons
      polygonLayerGroup.current = L.layerGroup().addTo(map.current)

      // Define tile layers
      tileLayers.current = {
        osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }),
        satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: '© Esri',
          maxZoom: 19
        }),
        topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenTopoMap contributors',
          maxZoom: 17
        }),
        dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '© CartoDB',
          maxZoom: 19
        })
      }

      // Add default tile layer
      tileLayers.current.osm.addTo(map.current)

      // Save map view changes with debouncing
      let saveTimeout: NodeJS.Timeout
      const saveMapView = () => {
        if (map.current && !isDestroyed.current) {
          try {
            const center = map.current.getCenter()
            const zoom = map.current.getZoom()
            if (center && typeof center.lat === 'number' && typeof center.lng === 'number') {
              const newView = {
                center: [center.lat, center.lng] as [number, number],
                zoom
              }
              onMapViewChange(newView)
              saveToStorage({ mapView: newView })
            }
          } catch (error) {
            console.warn('Error saving map view:', error)
          }
        }
      }

      const debouncedSaveMapView = () => {
        clearTimeout(saveTimeout)
        saveTimeout = setTimeout(saveMapView, 300)
      }

      map.current.on('moveend', debouncedSaveMapView)
      map.current.on('zoomend', debouncedSaveMapView)

      // Map loaded event with validation
      map.current.whenReady(() => {
        if (!isDestroyed.current && map.current) {
          // Double-check the map is still valid
          try {
            map.current.getCenter() // This will throw if map is invalid
            setMapLoaded(true)
          } catch (error) {
            console.error('Map validation failed:', error)
            setMapLoaded(false)
          }
        }
      })

      // Force initial render after a short delay
      const initTimer = setTimeout(() => {
        if (map.current && !isDestroyed.current) {
          try {
            map.current.invalidateSize()
          } catch (error) {
            console.warn('Error invalidating map size:', error)
          }
        }
      } , 100)

      return () => {
        clearTimeout(initTimer)
        clearTimeout(saveTimeout)
      }

    } catch (error) {
      console.error('Error initializing map:', error)
      setMapLoaded(false)
    }
  }, [leafletLoaded, mapView, onMapViewChange, isMobile])

  // Cleanup effect
  useEffect(() => {
    return () => {
      isDestroyed.current = true
      
      // Clean up map with proper error handling
      if (map.current) {
        try {
          // Remove all event listeners first
          map.current.off()
          
          // Clear layer groups safely
          if (polygonLayerGroup.current) {
            try {
              polygonLayerGroup.current.clearLayers()
              if (map.current.hasLayer && map.current.hasLayer(polygonLayerGroup.current)) {
                map.current.removeLayer(polygonLayerGroup.current)
              }
            } catch (error) {
              console.warn('Error clearing polygon layers:', error)
            }
            polygonLayerGroup.current = null
          }
          
          // Remove current polyline safely
          if (currentPolyline.current) {
            try {
              if (map.current.hasLayer && map.current.hasLayer(currentPolyline.current)) {
                map.current.removeLayer(currentPolyline.current)
              }
            } catch (error) {
              console.warn('Error removing polyline:', error)
            }
            currentPolyline.current = null
          }
          
          // Remove tile layers
          if (tileLayers.current) {
            Object.values(tileLayers.current).forEach((layer: any) => {
              try {
                if (layer && map.current && map.current.hasLayer && map.current.hasLayer(layer)) {
                  map.current.removeLayer(layer)
                }
              } catch (error) {
                console.warn('Error removing tile layer:', error)
              }
            })
            tileLayers.current = {}
          }
          
          // Remove map instance
          map.current.remove()
          
        } catch (error) {
          console.warn('Error during map cleanup:', error)
        } finally {
          map.current = null
          setMapLoaded(false)
        }
      }
    }
  }, []) // Empty dependency array for cleanup only

  // Safe layer manipulation helper
  const safeLayerOperation = useCallback((operation: () => void) => {
    if (isDestroyed.current || !map.current || !mapLoaded) return
  
    try {
      // Verify map is still valid before operation
      if (map.current.getContainer && map.current.getContainer()) {
        operation()
      }
    } catch (error) {
      console.warn('Layer operation failed:', error)
      // If map is invalid, mark as not loaded
      if (error.message && error.message.includes('_leaflet_pos')) {
        setMapLoaded(false)
      }
    }
  }, [mapLoaded])

  // Handle drawing mode
  useEffect(() => {
    if (!map.current || !mapLoaded || !L || isDestroyed.current) return

    // Remove existing click handler
    if (mapClickHandler.current) {
      try {
        map.current.off('click', mapClickHandler.current)
      } catch (error) {
        console.warn('Error removing click handler:', error)
      }
      mapClickHandler.current = null
    }

    if (isDrawingMode) {
      mapClickHandler.current = (e: any) => {
        if (isDestroyed.current || !e.latlng || typeof e.latlng.lat !== 'number' || typeof e.latlng.lng !== 'number') {
          return
        }

        const { lat, lng } = e.latlng
        
        setCurrentPolygon(prev => {
          const newPolygon = [...prev, [lat, lng]]
          
          // Remove previous polyline safely
          safeLayerOperation(() => {
            if (currentPolyline.current && map.current) {
              map.current.removeLayer(currentPolyline.current)
              currentPolyline.current = null
            }
          })

          // Add new polyline if we have more than one point
          if (newPolygon.length > 1) {
            safeLayerOperation(() => {
              const validCoords = newPolygon.filter(([lat, lng]) => 
                typeof lat === 'number' && typeof lng === 'number' && 
                !isNaN(lat) && !isNaN(lng) &&
                lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
              )
              
              if (validCoords.length > 1 && map.current) {
                currentPolyline.current = L.polyline(validCoords, {
                  color: '#3b82f6',
                  dashArray: '5, 5',
                  weight: 3,
                  opacity: 0.8
                }).addTo(map.current)
              }
            })
          }

          return newPolygon
        })
      }

      try {
        map.current.on('click', mapClickHandler.current)
      } catch (error) {
        console.warn('Error adding click handler:', error)
      }
    } else {
      // Clear current drawing safely
      safeLayerOperation(() => {
        if (currentPolyline.current && map.current) {
          map.current.removeLayer(currentPolyline.current)
          currentPolyline.current = null
        }
      })
      setCurrentPolygon([])
    }

    return () => {
      if (map.current && mapClickHandler.current) {
        try {
          map.current.off('click', mapClickHandler.current)
        } catch (error) {
          console.warn('Error removing click handler:', error)
        }
      }
    }
  }, [isDrawingMode, mapLoaded, safeLayerOperation])

  // Get polygon color based on weather data and color rules
  const getPolygonColor = useCallback((polygon: WeatherPolygon) => {
    if (!polygon.weatherData) return '#gray-400'

    const currentRule = colorRules.find(rule => rule.dataSource === selectedDataSource)
    if (!currentRule) return '#gray-400'

    const value = polygon.weatherData[selectedDataSource]
    if (typeof value !== 'number') return '#gray-400'

    const condition = currentRule.conditions.find(c => value >= c.min && value < c.max)
    return condition?.color || '#gray-400'
  }, [colorRules, selectedDataSource])

  // Update polygon layers safely
  useEffect(() => {
    if (!map.current || !mapLoaded || !polygonLayerGroup.current || !L || isDestroyed.current) return

    safeLayerOperation(() => {
      // Verify layer group is still valid
      if (!polygonLayerGroup.current || !map.current) return

      // Clear existing polygon layers
      polygonLayerGroup.current.clearLayers()

      // Add polygon layers with weather-based coloring
      polygons.forEach((polygon) => {
        // Validate polygon coordinates
        if (!polygon.coordinates || !Array.isArray(polygon.coordinates) || polygon.coordinates.length < 3) {
          return
        }

        const validCoords = polygon.coordinates.filter(([lat, lng]) => 
          typeof lat === 'number' && typeof lng === 'number' && 
          !isNaN(lat) && !isNaN(lng) &&
          lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
        )

        if (validCoords.length < 3) {
          return
        }

        try {
          const polygonColor = getPolygonColor(polygon)
        
          const leafletPolygon = L.polygon(validCoords, {
            color: polygonColor,
            fillColor: polygonColor,
            fillOpacity: 0.6,
            weight: 2,
            opacity: 1
          })

          // Verify polygon was created successfully
          if (!leafletPolygon) return

          // Create popup content with weather data
          const weatherInfo = polygon.weatherData ? `
          <div style="padding: 8px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px;">${polygon.name}</h3>
            <div style="font-size: 12px; line-height: 1.4;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #666;">Temperature:</span>
                <span style="font-weight: 500;">${polygon.weatherData.temperature.toFixed(1)}°C</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #666;">Humidity:</span>
                <span style="font-weight: 500;">${polygon.weatherData.humidity.toFixed(1)}%</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #666;">Wind Speed:</span>
                <span style="font-weight: 500;">${polygon.weatherData.windSpeed.toFixed(1)} km/h</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #666;">Precipitation:</span>
                <span style="font-weight: 500;">${polygon.weatherData.precipitation.toFixed(1)} mm</span>
              </div>
            </div>
          </div>
        ` : `
          <div style="padding: 8px;">
            <h3 style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px;">${polygon.name}</h3>
            <p style="margin: 0; color: #666; font-size: 12px;">Loading weather data...</p>
          </div>
        `

          leafletPolygon.bindPopup(weatherInfo)
        
          // Verify layer group is still valid before adding
          if (polygonLayerGroup.current && map.current) {
            polygonLayerGroup.current.addLayer(leafletPolygon)
          }
        } catch (error) {
          console.warn('Error creating polygon:', error)
        }
      })
    })
  }, [polygons, mapLoaded, getPolygonColor, safeLayerOperation])

  // Complete polygon drawing
  const completePolygon = useCallback(() => {
    if (currentPolygon.length < 3) return

    // Validate coordinates before creating polygon
    const validCoords = currentPolygon.filter(([lat, lng]) => 
      typeof lat === 'number' && typeof lng === 'number' && 
      !isNaN(lat) && !isNaN(lng) &&
      lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    )

    if (validCoords.length < 3) {
      console.warn('Not enough valid coordinates to create polygon')
      return
    }

    const polygon: Omit<WeatherPolygon, 'weatherData'> = {
      id: `polygon-${Date.now()}`,
      coordinates: validCoords,
      name: polygonName || `Area ${polygons.length + 1}`,
      color: '#3b82f6' // Will be overridden by weather data coloring
    }

    onAddPolygon(polygon)

    // Clear current drawing safely
    safeLayerOperation(() => {
      if (currentPolyline.current && map.current) {
        map.current.removeLayer(currentPolyline.current)
        currentPolyline.current = null
      }
    })
    
    setCurrentPolygon([])
    setPolygonName("")
  }, [currentPolygon, polygonName, polygons.length, onAddPolygon, safeLayerOperation])

  const cancelPolygon = useCallback(() => {
    safeLayerOperation(() => {
      if (currentPolyline.current && map.current) {
        map.current.removeLayer(currentPolyline.current)
        currentPolyline.current = null
      }
    })
    setCurrentPolygon([])
    setPolygonName("")
  }, [safeLayerOperation])

  const changeMapStyle = useCallback((style: string) => {
    if (!map.current || !tileLayers.current || isDestroyed.current) return

    safeLayerOperation(() => {
      // Remove current tile layer
      Object.values(tileLayers.current).forEach((layer: any) => {
        if (map.current.hasLayer(layer)) {
          map.current.removeLayer(layer)
        }
      })

      // Add new tile layer
      if (tileLayers.current[style]) {
        tileLayers.current[style].addTo(map.current)
        setMapStyle(style)
      }
    })
  }, [safeLayerOperation])

  const resetView = useCallback(() => {
    if (map.current && !isDestroyed.current) {
      try {
        map.current.flyTo([40.7128, -74.0060], 10, {
          animate: true,
          duration: 1
        })
      } catch (error) {
        console.warn('Error resetting view:', error)
      }
    }
  }, [])

  const zoomIn = useCallback(() => {
    if (map.current && !isDestroyed.current) {
      try {
        map.current.zoomIn()
      } catch (error) {
        console.warn('Error zooming in:', error)
      }
    }
  }, [])

  const zoomOut = useCallback(() => {
    if (map.current && !isDestroyed.current) {
      try {
        map.current.zoomOut()
      } catch (error) {
        console.warn('Error zooming out:', error)
      }
    }
  }, [])

  const getMapTileUrl = useCallback((style: string) => {
    switch (style) {
      case 'osm':
        return 'OpenStreetMap'
      case 'satellite':
        return 'Esri World Imagery'
      case 'topo':
        return 'OpenTopoMap'
      case 'dark':
        return 'CartoDB Dark Matter'
      default:
        return 'OpenStreetMap'
    }
  }, [])

  if (!leafletLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Leaflet...</p>
          <p className="text-sm text-gray-500 mt-2">
            Downloading OpenStreetMap library
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      {/* Mobile-responsive Map Controls */}
      <div className={`absolute top-4 left-4 z-[1000] flex flex-col gap-2 ${isMobile ? 'scale-90' : ''}`}>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={resetView}>
            <RotateCcw className="h-4 w-4" />
            {!isMobile && <span className="ml-1">Reset</span>}
          </Button>
          <Button size="sm" variant="outline" onClick={zoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={zoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>

        <div className={`flex gap-1 ${isMobile ? 'flex-wrap' : ''}`}>
          <Button
            size="sm"
            variant={mapStyle === 'osm' ? 'default' : 'outline'}
            onClick={() => changeMapStyle('osm')}
          >
            Street
          </Button>
          <Button
            size="sm"
            variant={mapStyle === 'satellite' ? 'default' : 'outline'}
            onClick={() => changeMapStyle('satellite')}
          >
            Satellite
          </Button>
          <Button
            size="sm"
            variant={mapStyle === 'topo' ? 'default' : 'outline'}
            onClick={() => changeMapStyle('topo')}
          >
            Topo
          </Button>
          <Button
            size="sm"
            variant={mapStyle === 'dark' ? 'default' : 'outline'}
            onClick={() => changeMapStyle('dark')}
          >
            Dark
          </Button>
        </div>
        
        {isDrawingMode && (
          <Card className={`p-3 ${isMobile ? 'max-w-[280px]' : 'max-w-xs'}`}>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Square className="h-4 w-4" />
                <span className="text-sm font-medium">Drawing Mode</span>
              </div>
              <Input
                placeholder="Area name"
                value={polygonName}
                onChange={(e) => setPolygonName(e.target.value)}
                className="h-8"
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={completePolygon} 
                  disabled={currentPolygon.length < 3}
                  className="flex-1"
                >
                  Complete
                </Button>
                <Button size="sm" variant="outline" onClick={cancelPolygon} className="flex-1">
                  Cancel
                </Button>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Points: {currentPolygon.length}</span>
                <Badge variant="secondary">
                  {currentPolygon.length >= 3 ? "Ready" : "Need " + (3 - currentPolygon.length)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {isMobile ? 'Tap to add points' : 'Click on the map to add points'}. Weather data will be fetched automatically.
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Map Info Panel */}
      <div className={`absolute top-4 right-4 z-[1000] ${isMobile ? 'scale-90' : ''}`}>
        <Card className="p-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Weather Map</span>
            </div>
            <div className="text-xs text-muted-foreground">
              <div>Tiles: {getMapTileUrl(mapStyle)}</div>
              <div>Zoom: {mapView.zoom}</div>
              <div>Polygons: {polygons.length}</div>
              <div>Drawing: {currentPolygon.length} points</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Loading State */}
      {!mapLoaded && leafletLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-[999]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Initializing Weather Map...</p>
            <p className="text-sm text-gray-500 mt-2">
              Loading OpenStreetMap tiles
            </p>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div 
        ref={mapContainer} 
        className="w-full h-full"
        style={{ 
          cursor: isDrawingMode ? 'crosshair' : 'grab'
        }}
      />
    </div>
  )
}
