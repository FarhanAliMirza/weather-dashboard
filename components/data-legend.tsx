"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Dataset } from "@/app/page"

interface DataLegendProps {
  datasets: Dataset[]
}

export function DataLegend({ datasets }: DataLegendProps) {
  const getValueRange = (dataset: Dataset) => {
    if (dataset.data.length === 0) return { min: 0, max: 0 }
    const values = dataset.data.map(d => d.value)
    return {
      min: Math.min(...values),
      max: Math.max(...values)
    }
  }

  const getUnit = (datasetId: string) => {
    switch (datasetId) {
      case 'temperature': return '°C'
      case 'humidity': return '%'
      case 'pollution': return 'AQI'
      default: return ''
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Data Legend</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {datasets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active datasets</p>
          ) : (
            datasets.map((dataset) => {
              const range = getValueRange(dataset)
              const unit = getUnit(dataset.id)
              
              return (
                <div key={dataset.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: dataset.color }}
                      />
                      <span className="font-medium">{dataset.name}</span>
                    </div>
                    <Badge variant="secondary">
                      {dataset.data.length} points
                    </Badge>
                  </div>
                  
                  {/* Color gradient bar */}
                  <div className="space-y-1">
                    <div
                      className="h-4 rounded-sm"
                      style={{
                        background: `linear-gradient(to right, 
                          ${dataset.color}20, 
                          ${dataset.color}80, 
                          ${dataset.color})`
                      }}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{range.min.toFixed(1)}{unit}</span>
                      <span>Low</span>
                      <span>High</span>
                      <span>{range.max.toFixed(1)}{unit}</span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Map Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>🖱️ Drag to pan</span>
          </div>
          <div className="flex justify-between">
            <span>🔍 Zoom controls</span>
          </div>
          <div className="flex justify-between">
            <span>✏️ Click to draw polygons</span>
          </div>
          <div className="flex justify-between">
            <span>📍 Hover for data details</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
