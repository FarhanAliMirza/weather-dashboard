"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, FileJson, Map, Image } from 'lucide-react'
import { exportToGeoJSON } from "@/lib/leaflet-utils"
import type { DataPoint, Polygon } from "@/app/page"

interface MapExportProps {
  data: DataPoint[]
  polygons: Polygon[]
}

export function MapExport({ data, polygons }: MapExportProps) {
  const [isExporting, setIsExporting] = useState(false)

  const exportGeoJSON = async () => {
    setIsExporting(true)
    
    try {
      const geoJSON = exportToGeoJSON(data, polygons)
      const blob = new Blob([JSON.stringify(geoJSON, null, 2)], {
        type: 'application/json'
      })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dashboard-data-${new Date().toISOString().split('T')[0]}.geojson`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const exportCSV = async () => {
    setIsExporting(true)
    
    try {
      const headers = ['id', 'lat', 'lng', 'value', 'timestamp', 'category']
      const csvContent = [
        headers.join(','),
        ...data.map(point => [
          point.id,
          point.lat,
          point.lng,
          point.value,
          point.timestamp,
          point.category
        ].join(','))
      ].join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dashboard-data-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('CSV export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span>Data Points:</span>
            <Badge variant="secondary">{data.length}</Badge>
          </div>
          <div className="flex justify-between">
            <span>Polygons:</span>
            <Badge variant="secondary">{polygons.length}</Badge>
          </div>
        </div>

        <div className="space-y-2">
          <Button 
            onClick={exportGeoJSON}
            disabled={isExporting || (data.length === 0 && polygons.length === 0)}
            className="w-full justify-start"
          >
            <FileJson className="h-4 w-4 mr-2" />
            Export as GeoJSON
          </Button>
          
          <Button 
            onClick={exportCSV}
            disabled={isExporting || data.length === 0}
            variant="outline"
            className="w-full justify-start"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Data as CSV
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>• GeoJSON includes both data points and polygons</p>
          <p>• CSV includes only data points with coordinates</p>
          <p>• Files are compatible with GIS software</p>
        </div>
      </CardContent>
    </Card>
  )
}
