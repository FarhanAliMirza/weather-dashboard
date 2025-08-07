"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ExternalLink, Key, Map } from 'lucide-react'
import { useState } from "react"

export function MapboxSetup() {
  const [apiKey, setApiKey] = useState("")
  const [isValidating, setIsValidating] = useState(false)

  const validateApiKey = async () => {
    setIsValidating(true)
    // Mock validation
    setTimeout(() => {
      setIsValidating(false)
    }, 1000)
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="h-5 w-5" />
          Mapbox Integration Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Key className="h-4 w-4" />
          <AlertDescription>
            To use real Mapbox maps, you'll need a Mapbox access token. 
            The current implementation shows a mock map for demonstration purposes.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label htmlFor="mapbox-token">Mapbox Access Token</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="mapbox-token"
                type="password"
                placeholder="pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJjbGV..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <Button 
                onClick={validateApiKey}
                disabled={!apiKey || isValidating}
              >
                {isValidating ? "Validating..." : "Validate"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Setup Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Create a free account at <a href="https://mapbox.com" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">mapbox.com</a></li>
              <li>Navigate to your account dashboard</li>
              <li>Create a new access token with the required scopes</li>
              <li>Install the Mapbox GL JS library: <code className="bg-gray-100 px-1 rounded">npm install mapbox-gl</code></li>
              <li>Add your token to environment variables: <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code></li>
            </ol>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Required Dependencies:</h3>
            <div className="bg-gray-50 p-3 rounded-lg">
              <code className="text-sm">
                npm install mapbox-gl @types/mapbox-gl
              </code>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Environment Variables:</h3>
            <div className="bg-gray-50 p-3 rounded-lg">
              <code className="text-sm">
                NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_token_here
              </code>
            </div>
          </div>

          <Button className="w-full" asChild>
            <a 
              href="https://docs.mapbox.com/help/getting-started/access-tokens/" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Mapbox Documentation
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
