"use client"

import { Palette, OctagonIcon, ToggleLeft, ToggleRight, Trash2, Map } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Dataset, Polygon } from "@/app/page"

interface DashboardSidebarProps {
  datasets: Dataset[]
  polygons: Polygon[]
  onToggleDataset: (datasetId: string) => void
  onRemovePolygon: (polygonId: string) => void
  isDrawingMode: boolean
  onToggleDrawingMode: (enabled: boolean) => void
}

export function DashboardSidebar({
  datasets,
  polygons,
  onToggleDataset,
  onRemovePolygon,
  isDrawingMode,
  onToggleDrawingMode
}: DashboardSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2">
          <Map className="h-6 w-6" />
          <span className="font-semibold">Dashboard Controls</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Drawing Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <Button
              variant={isDrawingMode ? "default" : "outline"}
              onClick={() => onToggleDrawingMode(!isDrawingMode)}
              className="w-full justify-start"
            >
              <OctagonIcon className="h-4 w-4 mr-2" />
              {isDrawingMode ? "Exit Drawing" : "Draw Polygon"}
            </Button>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Data Layers</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {datasets.map((dataset) => (
                <SidebarMenuItem key={dataset.id}>
                  <SidebarMenuButton
                    onClick={() => onToggleDataset(dataset.id)}
                    className="w-full justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: dataset.color }}
                      />
                      <span>{dataset.name}</span>
                    </div>
                    {dataset.enabled ? (
                      <ToggleRight className="h-4 w-4 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-gray-400" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Polygons ({polygons.length})</SidebarGroupLabel>
          <SidebarGroupContent>
            {polygons.length === 0 ? (
              <p className="text-sm text-muted-foreground px-2">
                No polygons created yet
              </p>
            ) : (
              <SidebarMenu>
                {polygons.map((polygon) => (
                  <SidebarMenuItem key={polygon.id}>
                    <div className="flex items-center justify-between w-full px-2 py-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: polygon.color }}
                        />
                        <span className="text-sm">{polygon.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemovePolygon(polygon.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Statistics</SidebarGroupLabel>
          <SidebarGroupContent>
            <Card>
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Active Layers:</span>
                    <Badge variant="secondary">
                      {datasets.filter(d => d.enabled).length}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Data Points:</span>
                    <Badge variant="secondary">
                      {datasets
                        .filter(d => d.enabled)
                        .reduce((sum, d) => sum + d.data.length, 0)}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Polygons:</span>
                    <Badge variant="secondary">{polygons.length}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
