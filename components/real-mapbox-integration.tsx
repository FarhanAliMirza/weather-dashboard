"use client"

// This file shows how to implement real Mapbox integration
// Uncomment and modify when you have a Mapbox token

/*
import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

// Set your Mapbox access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''

interface RealMapboxProps {
  data: DataPoint[]
  datasets: Dataset[]
  polygons: Polygon[]
  onAddPolygon: (polygon: Polygon) => void
  isDrawingMode: boolean
}

export function RealMapboxIntegration({
  data,
  datasets,
  polygons,
  onAddPolygon,
  isDrawingMode
}: RealMapboxProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-74.0060, 40.7128], // NYC
      zoom: 12
    })

    map.current.on('load', () => {
      setMapLoaded(true)
    })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    // Add fullscreen control
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right')

    return () => {
      map.current?.remove()
    }
  }, [])

  // Update data layers
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    datasets.forEach(dataset => {
      const sourceId = `${dataset.id}-source`
      const layerId = `${dataset.id}-layer`

      // Remove existing layer and source
      if (map.current?.getLayer(layerId)) {
        map.current.removeLayer(layerId)
      }
      if (map.current?.getSource(sourceId)) {
        map.current.removeSource(sourceId)
      }

      if (!dataset.enabled) return

      const filteredData = data.filter(d => d.category === dataset.id)
      if (filteredData.length === 0) return

      // Add source
      map.current?.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: filteredData.map(point => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [point.lng, point.lat]
            },
            properties: point
          }))
        }
      })

      // Add layer
      map.current?.addLayer({
        id: layerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'value'],
            0, 4,
            100, 20
          ],
          'circle-color': dataset.color,
          'circle-opacity': 0.8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      })

      // Add click handler for popups
      map.current?.on('click', layerId, (e) => {
        const coordinates = e.features![0].geometry.coordinates.slice()
        const properties = e.features![0].properties

        new mapboxgl.Popup()
          .setLngLat(coordinates)
          .setHTML(`
            <div>
              <h3>${dataset.name}</h3>
              <p>Value: ${properties.value}</p>
              <p>Time: ${new Date(properties.timestamp).toLocaleString()}</p>
            </div>
          `)
          .addTo(map.current!)
      })

      // Change cursor on hover
      map.current?.on('mouseenter', layerId, () => {
        map.current!.getCanvas().style.cursor = 'pointer'
      })

      map.current?.on('mouseleave', layerId, () => {
        map.current!.getCanvas().style.cursor = ''
      })
    })
  }, [data, datasets, mapLoaded])

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  )
}
*/

// Placeholder component for documentation
export function RealMapboxIntegration() {
  return (
    <div className="flex items-center justify-center h-full bg-gray-50">
      <div className="text-center p-8">
        <h3 className="text-lg font-semibold mb-2">Real Mapbox Integration</h3>
        <p className="text-gray-600 mb-4">
          Uncomment the code above and add your Mapbox token to enable real map integration
        </p>
        <div className="bg-gray-100 p-4 rounded-lg text-left">
          <code className="text-sm">
            NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_token_here
          </code>
        </div>
      </div>
    </div>
  )
}
