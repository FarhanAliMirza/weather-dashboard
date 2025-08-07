export interface MapboxConfig {
  accessToken: string
  style: string
  center: [number, number]
  zoom: number
}

export const defaultMapboxConfig: MapboxConfig = {
  accessToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [-74.0060, 40.7128], // NYC
  zoom: 12
}

export const mapboxStyles = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11'
}

// Convert data points to GeoJSON format
export function dataPointsToGeoJSON(points: any[]) {
  return {
    type: 'FeatureCollection',
    features: points.map(point => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [point.lng, point.lat]
      },
      properties: {
        ...point
      }
    }))
  }
}

// Convert polygon coordinates to GeoJSON format
export function polygonToGeoJSON(polygon: any) {
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [polygon.coordinates.concat([polygon.coordinates[0]])]
    },
    properties: {
      name: polygon.name,
      color: polygon.color,
      id: polygon.id
    }
  }
}

// Create heatmap layer configuration
export function createHeatmapLayer(sourceId: string, color: string) {
  return {
    id: `${sourceId}-heatmap`,
    type: 'heatmap',
    source: sourceId,
    maxzoom: 15,
    paint: {
      'heatmap-weight': [
        'interpolate',
        ['linear'],
        ['get', 'value'],
        0, 0,
        100, 1
      ],
      'heatmap-intensity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, 1,
        15, 3
      ],
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(33,102,172,0)',
        0.2, color + '40',
        0.4, color + '80',
        0.6, color + 'CC',
        0.8, color,
        1, color
      ],
      'heatmap-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, 2,
        15, 20
      ]
    }
  }
}

// Create circle layer configuration for data points
export function createCircleLayer(sourceId: string, color: string) {
  return {
    id: `${sourceId}-circles`,
    type: 'circle',
    source: sourceId,
    minzoom: 14,
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['get', 'value'],
        0, 4,
        100, 20
      ],
      'circle-color': color,
      'circle-opacity': 0.8,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff'
    }
  }
}

// Validate Mapbox access token format
export function isValidMapboxToken(token: string): boolean {
  return token.startsWith('pk.') && token.length > 50
}

// Get bounds for a set of coordinates
export function getBounds(coordinates: [number, number][]) {
  if (coordinates.length === 0) return null

  let minLng = coordinates[0][0]
  let maxLng = coordinates[0][0]
  let minLat = coordinates[0][1]
  let maxLat = coordinates[0][1]

  coordinates.forEach(([lng, lat]) => {
    minLng = Math.min(minLng, lng)
    maxLng = Math.max(maxLng, lng)
    minLat = Math.min(minLat, lat)
    maxLat = Math.max(maxLat, lat)
  })

  return [
    [minLng, minLat],
    [maxLng, maxLat]
  ]
}
