"use client"

import { useState, useCallback, useEffect } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { WeatherSidebar } from "@/components/weather-sidebar"
import { LeafletVisualization } from "@/components/leaflet-visualization"
import { WeatherTimeline } from "@/components/weather-timeline"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Card } from "@/components/ui/card"
import { saveToStorage, getFromStorage } from "@/lib/storage"

export interface WeatherPolygon {
  id: string
  coordinates: [number, number][]
  name: string
  color: string
  weatherData?: {
    temperature: number
    humidity: number
    windSpeed: number
    precipitation: number
  }
}

export interface ColorRule {
  id: string
  dataSource: 'temperature' | 'humidity' | 'windSpeed' | 'precipitation'
  conditions: {
    min: number
    max: number
    color: string
    label: string
  }[]
}

export interface TimeSelection {
  mode: 'single' | 'range'
  single?: number // timestamp for single point
  range?: [number, number] // start and end timestamps for range
}

export interface DataPoint {
  id: string;
  lat: number;
  lng: number;
  value: number;
  timestamp: number;
  category: string;
}

export interface Dataset {
  id: string;
  name: string;
  color: string;
  data: DataPoint[];
  enabled: boolean;
}

export interface Polygon {
  id: string;
  points: { x: number; y: number }[];
  name: string;
  color: string;
  coordinates: [number, number][]
}

export default function WeatherDashboard() {
  // Initialize state from localStorage
  const [isInitialized, setIsInitialized] = useState(false)
  const [polygons, setPolygons] = useState<WeatherPolygon[]>([])
  const [isDrawingMode, setIsDrawingMode] = useState(false)
  const [colorRules, setColorRules] = useState<ColorRule[]>([])
  const [selectedDataSource, setSelectedDataSource] = useState<'temperature' | 'humidity' | 'windSpeed' | 'precipitation'>('temperature')
  const [timeSelection, setTimeSelection] = useState<TimeSelection>({
    mode: 'single',
    single: Date.now()
  })
  const [mapView, setMapView] = useState<{ center: [number, number]; zoom: number }>({
    center: [40.7128, -74.0060],
    zoom: 10
  })

  // Load state from localStorage on mount
  useEffect(() => {
    const loadState = () => {
      try {
        if (typeof window !== 'undefined') {
          const stored = getFromStorage()
          
          if (stored.polygons && Array.isArray(stored.polygons)) {
            setPolygons(stored.polygons)
          }
          if (stored.colorRules && Array.isArray(stored.colorRules)) {
            setColorRules(stored.colorRules)
          }
          if (stored.selectedDataSource) {
            setSelectedDataSource(stored.selectedDataSource as any)
          }
          if (stored.timeSelection) {
            setTimeSelection(stored.timeSelection)
          }
          if (stored.mapView) {
            setMapView(stored.mapView)
          }
        }
      } catch (error) {
        console.warn('Failed to load state from localStorage:', error)
      } finally {
        setIsInitialized(true)
      }
    }

    // Add a small delay to ensure DOM is ready
    const timer = setTimeout(loadState, 100)
    return () => clearTimeout(timer)
  }, [])

  // Fallback timeout to prevent infinite loading
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (!isInitialized) {
        console.warn('Loading timeout, initializing with defaults')
        setIsInitialized(true)
      }
    }, 3000) // 3 second timeout

    return () => clearTimeout(fallbackTimer)
  }, [isInitialized])

  const addPolygon = useCallback((polygon: Omit<WeatherPolygon, 'weatherData'>) => {
    const newPolygon: WeatherPolygon = {
      ...polygon,
      weatherData: undefined // Will be fetched after creation
    }
    
    setPolygons(prev => {
      const updated = [...prev, newPolygon]
      saveToStorage({ polygons: updated })
      return updated
    })
  }, [])

  const removePolygon = useCallback((polygonId: string) => {
    setPolygons(prev => {
      const updated = prev.filter(p => p.id !== polygonId)
      saveToStorage({ polygons: updated })
      return updated
    })
  }, [])

  const updatePolygonWeatherData = useCallback((polygonId: string, weatherData: WeatherPolygon['weatherData']) => {
    setPolygons(prev => {
      const updated = prev.map(p => 
        p.id === polygonId ? { ...p, weatherData } : p
      )
      saveToStorage({ polygons: updated })
      return updated
    })
  }, [])

  const updateColorRules = useCallback((rules: ColorRule[]) => {
    setColorRules(rules)
    saveToStorage({ colorRules: rules })
  }, [])

  const handleDataSourceChange = useCallback((source: 'temperature' | 'humidity' | 'windSpeed' | 'precipitation') => {
    setSelectedDataSource(source)
    saveToStorage({ selectedDataSource: source })
  }, [])

  const handleTimeSelectionChange = useCallback((selection: TimeSelection) => {
    setTimeSelection(selection)
    saveToStorage({ timeSelection: selection })
  }, [])

  const handleMapViewChange = useCallback((view: { center: [number, number]; zoom: number }) => {
    setMapView(view)
    // Note: saveToStorage is called in the map component to avoid too frequent saves
  }, [])

  // Don't render until state is loaded from localStorage
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full">
        <WeatherSidebar
          polygons={polygons}
          colorRules={colorRules}
          selectedDataSource={selectedDataSource}
          onRemovePolygon={removePolygon}
          onUpdateColorRules={updateColorRules}
          onDataSourceChange={handleDataSourceChange}
          isDrawingMode={isDrawingMode}
          onToggleDrawingMode={setIsDrawingMode}
        />
        
        <div className="flex-1 flex flex-col">
          <header className="border-b p-4 flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-2xl font-bold">Weather Data Dashboard</h1>
          </header>
          
          {/* 30-day Timeline at top */}
          <div className="border-b bg-white">
            <WeatherTimeline
              timeSelection={timeSelection}
              onTimeSelectionChange={handleTimeSelectionChange}
              polygons={polygons}
              onUpdatePolygonWeatherData={updatePolygonWeatherData}
              colorRules={colorRules}
              selectedDataSource={selectedDataSource}
            />
          </div>
          
          <div className="flex-1 p-4">
            <Card className="h-full p-0 overflow-hidden">
              <LeafletVisualization
                polygons={polygons}
                onAddPolygon={addPolygon}
                isDrawingMode={isDrawingMode}
                colorRules={colorRules}
                selectedDataSource={selectedDataSource}
                data={[]} // No longer using mock data points
                datasets={[]} // No longer using datasets
                mapView={mapView}
                onMapViewChange={handleMapViewChange}
              />
            </Card>
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}
