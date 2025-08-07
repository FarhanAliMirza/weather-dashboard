export interface StorageData {
  polygons: any[]
  colorRules: any[]
  selectedDataSource: string
  timeSelection: any
  mapView: {
    center: [number, number]
    zoom: number
  }
}

const STORAGE_KEY = 'weather-dashboard-state'

export function saveToStorage(data: Partial<StorageData>): void {
  try {
    const existing = getFromStorage()
    const updated = { ...existing, ...data }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.warn('Failed to save to localStorage:', error)
  }
}

export function getFromStorage(): StorageData {
  const defaultState: StorageData = {
    polygons: [],
    colorRules: [
      {
        id: 'temp-default',
        dataSource: 'temperature',
        conditions: [
          { min: -50, max: 0, color: '#3b82f6', label: 'Very Cold' },
          { min: 0, max: 10, color: '#06b6d4', label: 'Cold' },
          { min: 10, max: 20, color: '#10b981', label: 'Mild' },
          { min: 20, max: 30, color: '#f59e0b', label: 'Warm' },
          { min: 30, max: 50, color: '#ef4444', label: 'Hot' }
        ]
      },
      {
        id: 'humidity-default',
        dataSource: 'humidity',
        conditions: [
          { min: 0, max: 30, color: '#fbbf24', label: 'Dry' },
          { min: 30, max: 60, color: '#10b981', label: 'Comfortable' },
          { min: 60, max: 80, color: '#3b82f6', label: 'Humid' },
          { min: 80, max: 100, color: '#1e40af', label: 'Very Humid' }
        ]
      },
      {
        id: 'wind-default',
        dataSource: 'windSpeed',
        conditions: [
          { min: 0, max: 10, color: '#10b981', label: 'Calm' },
          { min: 10, max: 20, color: '#f59e0b', label: 'Breezy' },
          { min: 20, max: 40, color: '#ef4444', label: 'Windy' },
          { min: 40, max: 100, color: '#7c2d12', label: 'Very Windy' }
        ]
      },
      {
        id: 'precip-default',
        dataSource: 'precipitation',
        conditions: [
          { min: 0, max: 1, color: '#e5e7eb', label: 'None' },
          { min: 1, max: 5, color: '#3b82f6', label: 'Light' },
          { min: 5, max: 15, color: '#1d4ed8', label: 'Moderate' },
          { min: 15, max: 50, color: '#1e3a8a', label: 'Heavy' }
        ]
      }
    ],
    selectedDataSource: 'temperature',
    timeSelection: {
      mode: 'single',
      single: Date.now()
    },
    mapView: {
      center: [40.7128, -74.0060],
      zoom: 10
    }
  }

  try {
    if (typeof window === 'undefined') {
      return defaultState
    }

    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return defaultState
    }

    const parsed = JSON.parse(stored)
    
    // Validate and merge with defaults
    return {
      polygons: Array.isArray(parsed.polygons) ? parsed.polygons : defaultState.polygons,
      colorRules: Array.isArray(parsed.colorRules) ? parsed.colorRules : defaultState.colorRules,
      selectedDataSource: parsed.selectedDataSource || defaultState.selectedDataSource,
      timeSelection: parsed.timeSelection || defaultState.timeSelection,
      mapView: parsed.mapView || defaultState.mapView
    }
  } catch (error) {
    console.warn('Failed to load from localStorage, using defaults:', error)
    return defaultState
  }
}

export function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('Failed to clear localStorage:', error)
  }
}
