"use client"

import React from 'react'
import { useState, useCallback } from 'react'
import { Palette, Square, Trash2, Plus, Thermometer, Droplets, Wind, CloudRain } from 'lucide-react'
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { WeatherPolygon, ColorRule } from "@/app/page"

interface WeatherSidebarProps {
  polygons: WeatherPolygon[]
  colorRules: ColorRule[]
  selectedDataSource: 'temperature' | 'humidity' | 'windSpeed' | 'precipitation'
  onRemovePolygon: (polygonId: string) => void
  onUpdateColorRules: (rules: ColorRule[]) => void
  onDataSourceChange: (source: 'temperature' | 'humidity' | 'windSpeed' | 'precipitation') => void
  isDrawingMode: boolean
  onToggleDrawingMode: (enabled: boolean) => void
}

export function WeatherSidebar({
  polygons,
  colorRules,
  selectedDataSource,
  onRemovePolygon,
  onUpdateColorRules,
  onDataSourceChange,
  isDrawingMode,
  onToggleDrawingMode
}: WeatherSidebarProps) {
  const [editingRule, setEditingRule] = useState<string | null>(null)

  const dataSourceIcons = {
    temperature: Thermometer,
    humidity: Droplets,
    windSpeed: Wind,
    precipitation: CloudRain
  }

  const dataSourceLabels = {
    temperature: 'Temperature (°C)',
    humidity: 'Humidity (%)',
    windSpeed: 'Wind Speed (km/h)',
    precipitation: 'Precipitation (mm)'
  }

  const currentRule = colorRules.find(rule => rule.dataSource === selectedDataSource)

  const addColorCondition = useCallback(() => {
    if (!currentRule) return

    const newCondition = {
      min: 0,
      max: 10,
      color: '#3b82f6',
      label: 'New Condition'
    }

    const updatedRule = {
      ...currentRule,
      conditions: [...currentRule.conditions, newCondition]
    }

    const updatedRules = colorRules.map(rule => 
      rule.id === currentRule.id ? updatedRule : rule
    )

    onUpdateColorRules(updatedRules)
  }, [currentRule, colorRules, onUpdateColorRules])

  const updateColorCondition = useCallback(
    (
      index: number,
      field: keyof (typeof currentRule extends { conditions: Array<infer T> } ? T : never),
      value: any
    ) => {
      if (!currentRule) return

      const updatedConditions = currentRule.conditions.map((condition, i) =>
        i === index ? { ...condition, [field]: value } : condition
      )

    const updatedRule = {
      ...currentRule,
      conditions: updatedConditions
    }

    const updatedRules = colorRules.map(rule => 
      rule.id === currentRule.id ? updatedRule : rule
    )

    onUpdateColorRules(updatedRules)
  }, [currentRule, colorRules, onUpdateColorRules])

  const removeColorCondition = useCallback((index: number) => {
    if (!currentRule || currentRule.conditions.length <= 1) return

    const updatedConditions = currentRule.conditions.filter((_, i) => i !== index)

    const updatedRule = {
      ...currentRule,
      conditions: updatedConditions
    }

    const updatedRules = colorRules.map(rule => 
      rule.id === currentRule.id ? updatedRule : rule
    )

    onUpdateColorRules(updatedRules)
  }, [currentRule, colorRules, onUpdateColorRules])

  const getPolygonColor = useCallback((polygon: WeatherPolygon) => {
    if (!polygon.weatherData || !currentRule) return '#gray-400'

    const value = polygon.weatherData[selectedDataSource]
    if (typeof value !== 'number') return '#gray-400'

    const condition = currentRule.conditions.find(c => value >= c.min && value < c.max)
    return condition?.color || '#gray-400'
  }, [currentRule, selectedDataSource])

  const getPolygonValue = useCallback((polygon: WeatherPolygon) => {
    if (!polygon.weatherData) return 'Loading...'
    
    const value = polygon.weatherData[selectedDataSource]
    if (typeof value !== 'number') return 'No data'

    const unit = selectedDataSource === 'temperature' ? '°C' : 
                 selectedDataSource === 'humidity' ? '%' :
                 selectedDataSource === 'windSpeed' ? 'km/h' : 'mm'
    
    return `${value.toFixed(1)}${unit}`
  }, [selectedDataSource])

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2">
          <Palette className="h-6 w-6" />
          <span className="font-semibold">Weather Controls</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {/* Drawing Tools */}
        <SidebarGroup>
          <SidebarGroupLabel>Drawing Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <Button
              variant={isDrawingMode ? "default" : "outline"}
              onClick={() => onToggleDrawingMode(!isDrawingMode)}
              className="w-full justify-start"
            >
              <Square className="h-4 w-4 mr-2" />
              {isDrawingMode ? "Exit Drawing" : "Draw Polygon"}
            </Button>
            {isDrawingMode && (
              <p className="text-xs text-muted-foreground mt-2 px-2">
                Click on the map to add points. Complete with 3+ points.
              </p>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Data Source Selection */}
        <SidebarGroup>
          <SidebarGroupLabel>Data Source</SidebarGroupLabel>
          <SidebarGroupContent>
            <Select value={selectedDataSource} onValueChange={onDataSourceChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(dataSourceLabels).map(([key, label]) => {
                  const Icon = dataSourceIcons[key as keyof typeof dataSourceIcons]
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {label}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Color Rules */}
        <SidebarGroup>
          <SidebarGroupLabel>Color Rules</SidebarGroupLabel>
          <SidebarGroupContent>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  {React.createElement(dataSourceIcons[selectedDataSource], { className: "h-4 w-4" })}
                  {dataSourceLabels[selectedDataSource]}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentRule?.conditions.map((condition, index) => (
                  <div key={index} className="space-y-2 p-2 border rounded">
                    <div className="flex items-center justify-between">
                      <Input
                        value={condition.label}
                        onChange={(e) => updateColorCondition(index, 'label', e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Label"
                      />
                      {currentRule.conditions.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeColorCondition(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Min</Label>
                        <Input
                          type="number"
                          value={condition.min}
                          onChange={(e) => updateColorCondition(index, 'min', parseFloat(e.target.value))}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Max</Label>
                        <Input
                          type="number"
                          value={condition.max}
                          onChange={(e) => updateColorCondition(index, 'max', parseFloat(e.target.value))}
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={condition.color}
                        onChange={(e) => updateColorCondition(index, 'color', e.target.value)}
                        className="w-8 h-7 rounded border"
                      />
                      <div
                        className="flex-1 h-7 rounded border"
                        style={{ backgroundColor: condition.color }}
                      />
                    </div>
                  </div>
                ))}
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addColorCondition}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Condition
                </Button>
              </CardContent>
            </Card>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Polygons List */}
        <SidebarGroup>
          <SidebarGroupLabel>Polygons ({polygons.length})</SidebarGroupLabel>
          <SidebarGroupContent>
            {polygons.length === 0 ? (
              <p className="text-sm text-muted-foreground px-2">
                No polygons created yet. Use the drawing tool to create areas for weather data.
              </p>
            ) : (
              <SidebarMenu>
                {polygons.map((polygon) => (
                  <SidebarMenuItem key={polygon.id}>
                    <div className="flex items-center justify-between w-full px-2 py-2 rounded hover:bg-accent">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className="w-4 h-4 rounded border border-white shadow-sm flex-shrink-0"
                          style={{ backgroundColor: getPolygonColor(polygon) }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{polygon.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {getPolygonValue(polygon)}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemovePolygon(polygon.id)}
                        className="flex-shrink-0"
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

        {/* Statistics */}
        <SidebarGroup>
          <SidebarGroupLabel>Statistics</SidebarGroupLabel>
          <SidebarGroupContent>
            <Card>
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Polygons:</span>
                    <Badge variant="secondary">{polygons.length}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>With Weather Data:</span>
                    <Badge variant="secondary">
                      {polygons.filter(p => p.weatherData).length}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Data Source:</span>
                    <Badge variant="outline">{dataSourceLabels[selectedDataSource]}</Badge>
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
