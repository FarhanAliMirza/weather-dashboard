export interface LeafletConfig {
  center: [number, number]
  zoom: number
  minZoom: number
  maxZoom: number
}

export const defaultLeafletConfig: LeafletConfig = {
  center: [40.7128, -74.0060], // NYC
  zoom: 12,
  minZoom: 1,
  maxZoom: 19
}

// Available tile layer providers (all free)
export const tileProviders = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    name: 'OpenStreetMap',
    maxZoom: 19
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri',
    name: 'Satellite',
    maxZoom: 19
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap contributors',
    name: 'Topographic',
    maxZoom: 17
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© CartoDB',
    name: 'Dark',
    maxZoom: 19
  },
  watercolor: {
    url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg',
    attribution: '© Stamen Design',
    name: 'Watercolor',
    maxZoom: 16
  },
  terrain: {
    url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg',
    attribution: '© Stamen Design',
    name: 'Terrain',
    maxZoom: 18
  }
}

// Create marker style based on data value
export function createMarkerStyle(value: number, color: string, maxValue: number = 100) {
  const intensity = value / maxValue
  return {
    radius: 5 + intensity * 15,
    fillColor: color,
    color: '#ffffff',
    weight: 2,
    opacity: 1,
    fillOpacity: 0.8
  }
}

// Create polygon style
export function createPolygonStyle(color: string, opacity: number = 0.3) {
  return {
    color: color,
    fillColor: color,
    fillOpacity: opacity,
    weight: 2,
    opacity: 1
  }
}

// Generate popup content for data points
export function createDataPopup(point: any, datasetName: string) {
  return `
    <div class="p-2 min-w-[200px]">
      <h3 class="font-semibold text-sm mb-2">${datasetName}</h3>
      <div class="space-y-1 text-xs">
        <div class="flex justify-between">
          <span class="text-gray-600">Value:</span>
          <span class="font-medium">${point.value.toFixed(1)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Time:</span>
          <span class="font-medium">${new Date(point.timestamp).toLocaleString()}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Location:</span>
          <span class="font-medium">${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">ID:</span>
          <span class="font-medium">${point.id}</span>
        </div>
      </div>
    </div>
  `
}

// Generate popup content for polygons
export function createPolygonPopup(polygon: any) {
  const area = calculatePolygonArea(polygon.coordinates)
  return `
    <div class="p-2 min-w-[200px]">
      <h3 class="font-semibold text-sm mb-2">${polygon.name}</h3>
      <div class="space-y-1 text-xs">
        <div class="flex justify-between">
          <span class="text-gray-600">Points:</span>
          <span class="font-medium">${polygon.coordinates.length}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Area:</span>
          <span class="font-medium">${area.toFixed(2)} km²</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">ID:</span>
          <span class="font-medium">${polygon.id}</span>
        </div>
      </div>
    </div>
  `
}

// Calculate polygon area using shoelace formula
export function calculatePolygonArea(coordinates: [number, number][]): number {
  if (coordinates.length < 3) return 0

  let area = 0
  const n = coordinates.length

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += coordinates[i][0] * coordinates[j][1]
    area -= coordinates[j][0] * coordinates[i][1]
  }

  area = Math.abs(area) / 2

  // Convert to approximate km² (very rough approximation)
  const kmPerDegree = 111.32 // Approximate km per degree at equator
  return area * kmPerDegree * kmPerDegree
}

// Distance calculation between two points (Haversine formula)
export function calculateDistance(
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number
): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Check if a point is inside a polygon
export function isPointInPolygon(
  point: [number, number], 
  polygon: [number, number][]
): boolean {
  const [lat, lng] = point
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [lati, lngi] = polygon[i]
    const [latj, lngj] = polygon[j]

    if (((lngi > lng) !== (lngj > lng)) &&
        (lat < (latj - lati) * (lng - lngi) / (lngj - lngi) + lati)) {
      inside = !inside
    }
  }

  return inside
}

// Calculate bounds for a set of coordinates
export function calculateBounds(coordinates: [number, number][]) {
  if (coordinates.length === 0) return null

  let minLat = coordinates[0][0]
  let maxLat = coordinates[0][0]
  let minLng = coordinates[0][1]
  let maxLng = coordinates[0][1]

  coordinates.forEach(([lat, lng]) => {
    minLat = Math.min(minLat, lat)
    maxLat = Math.max(maxLat, lat)
    minLng = Math.min(minLng, lng)
    maxLng = Math.max(maxLng, lng)
  })

  return [
    [minLat, minLng],
    [maxLat, maxLng]
  ] as [[number, number], [number, number]]
}

// Generate random coordinates within bounds for testing
export function generateRandomCoordinates(
  bounds: [[number, number], [number, number]], 
  count: number
): [number, number][] {
  const [[minLat, minLng], [maxLat, maxLng]] = bounds
  const coordinates: [number, number][] = []

  for (let i = 0; i < count; i++) {
    const lat = minLat + Math.random() * (maxLat - minLat)
    const lng = minLng + Math.random() * (maxLng - minLng)
    coordinates.push([lat, lng])
  }

  return coordinates
}

// Export data to GeoJSON format
export function exportToGeoJSON(data: any[], polygons: any[]) {
  return {
    type: 'FeatureCollection',
    features: [
      // Data points as features
      ...data.map(point => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [point.lng, point.lat]
        },
        properties: {
          ...point
        }
      })),
      // Polygons as features
      ...polygons.map(polygon => ({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [polygon.coordinates.map(([lat, lng]: [number, number]) => [lng, lat])]
        },
        properties: {
          name: polygon.name,
          color: polygon.color,
          id: polygon.id
        }
      }))
    ]
  }
}
