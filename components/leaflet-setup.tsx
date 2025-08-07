"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ExternalLink, Map, CheckCircle, Download } from 'lucide-react'

export function LeafletSetup() {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="h-5 w-5" />
          Real Leaflet Integration Active
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            ✅ Real Leaflet integration is now active! The map loads OpenStreetMap tiles directly from CDN.
            No installation or API keys required.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Current Implementation:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>✅ Leaflet loaded from CDN (no npm install needed)</li>
              <li>✅ Real OpenStreetMap tiles</li>
              <li>✅ Interactive pan, zoom, and click</li>
              <li>✅ Multiple tile providers (Street, Satellite, Topo, Dark)</li>
              <li>✅ Real polygon drawing with coordinates</li>
              <li>✅ Data point visualization with popups</li>
              <li>✅ Responsive and mobile-friendly</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Features Available:</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-green-50 p-2 rounded">
                <strong>Map Interaction:</strong>
                <ul className="text-xs mt-1 space-y-1">
                  <li>• Pan and zoom</li>
                  <li>• Multiple tile layers</li>
                  <li>• Fit to data bounds</li>
                </ul>
              </div>
              <div className="bg-blue-50 p-2 rounded">
                <strong>Data Visualization:</strong>
                <ul className="text-xs mt-1 space-y-1">
                  <li>• Circle markers</li>
                  <li>• Value-based sizing</li>
                  <li>• Interactive popups</li>
                </ul>
              </div>
              <div className="bg-purple-50 p-2 rounded">
                <strong>Polygon Drawing:</strong>
                <ul className="text-xs mt-1 space-y-1">
                  <li>• Click to add points</li>
                  <li>• Real-time preview</li>
                  <li>• Custom naming</li>
                </ul>
              </div>
              <div className="bg-orange-50 p-2 rounded">
                <strong>Layer Management:</strong>
                <ul className="text-xs mt-1 space-y-1">
                  <li>• Toggle datasets</li>
                  <li>• Dynamic updates</li>
                  <li>• Color coding</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Available Tile Providers:</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>• <strong>OpenStreetMap:</strong> Standard street map</div>
              <div>• <strong>Esri Satellite:</strong> High-res satellite imagery</div>
              <div>• <strong>OpenTopoMap:</strong> Detailed topographic maps</div>
              <div>• <strong>CartoDB Dark:</strong> Dark theme for night viewing</div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">For Local Development:</h3>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm mb-2">To use npm package instead of CDN:</p>
              <code className="text-sm">
                npm install leaflet @types/leaflet
              </code>
              <p className="text-xs mt-2 text-gray-600">
                Then replace CDN imports with: import L from 'leaflet'
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" asChild>
              <a 
                href="https://leafletjs.com/examples/" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Leaflet Examples
              </a>
            </Button>
            <Button variant="outline" className="flex-1" asChild>
              <a 
                href="https://www.openstreetmap.org/" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                OpenStreetMap
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
