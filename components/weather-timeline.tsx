"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, SkipBack, SkipForward, Clock, Calendar, Keyboard } from 'lucide-react'
import { fetchWeatherData } from "@/lib/weather-api"
import { saveToStorage } from "@/lib/storage"
import type { WeatherPolygon, ColorRule, TimeSelection } from "@/app/page"

interface WeatherTimelineProps {
  timeSelection: TimeSelection
  onTimeSelectionChange: (selection: TimeSelection) => void
  polygons: WeatherPolygon[]
  onUpdatePolygonWeatherData: (polygonId: string, weatherData: WeatherPolygon['weatherData']) => void
  colorRules: ColorRule[]
  selectedDataSource: 'temperature' | 'humidity' | 'windSpeed' | 'precipitation'
}

export function WeatherTimeline({
  timeSelection,
  onTimeSelectionChange,
  polygons,
  onUpdatePolygonWeatherData,
  colorRules,
  selectedDataSource
}: WeatherTimelineProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'single' | 'range' | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const timelineRef = useRef<HTMLDivElement>(null)
  const playInterval = useRef<NodeJS.Timeout | null>(null)

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 30-day window with current day in middle
  const now = Date.now()
  const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000
  const timeExtent: [number, number] = [now - fifteenDaysMs, now + fifteenDaysMs]

  // Generate hourly time steps for 30 days
  const timeSteps = useMemo(() => {
    const [start, end] = timeExtent
    const steps = []
    const hourMs = 60 * 60 * 1000 // 1 hour
    
    for (let time = start; time <= end; time += hourMs) {
      steps.push(time)
    }
    return steps
  }, [timeExtent])

  // Convert timestamp to position percentage
  const timeToPosition = useCallback((timestamp: number) => {
    const [start, end] = timeExtent
    return ((timestamp - start) / (end - start)) * 100
  }, [timeExtent])

  // Convert position percentage to timestamp
  const positionToTime = useCallback((position: number) => {
    const [start, end] = timeExtent
    const timestamp = start + (position / 100) * (end - start)
    // Round to nearest hour
    return Math.round(timestamp / (60 * 60 * 1000)) * (60 * 60 * 1000)
  }, [timeExtent])

  // Fetch weather data for all polygons
  const fetchAllWeatherData = useCallback(async () => {
    if (polygons.length === 0) return

    setIsLoading(true)
    try {
      const promises = polygons.map(async (polygon) => {
        try {
          // Calculate center point of polygon
          const centerLat = polygon.coordinates.reduce((sum, [lat]) => sum + lat, 0) / polygon.coordinates.length
          const centerLng = polygon.coordinates.reduce((sum, [, lng]) => sum + lng, 0) / polygon.coordinates.length

          let startTime: number, endTime: number

          if (timeSelection.mode === 'single' && timeSelection.single) {
            startTime = endTime = timeSelection.single
          } else if (timeSelection.mode === 'range' && timeSelection.range) {
            [startTime, endTime] = timeSelection.range
          } else {
            return
          }

          const weatherData = await fetchWeatherData(centerLat, centerLng, startTime, endTime)
          onUpdatePolygonWeatherData(polygon.id, weatherData)
        } catch (error) {
          console.error(`Failed to fetch weather data for polygon ${polygon.id}:`, error)
        }
      })

      await Promise.all(promises)
    } finally {
      setIsLoading(false)
    }
  }, [polygons, timeSelection, onUpdatePolygonWeatherData])

  // Fetch weather data when time selection changes
  useEffect(() => {
    fetchAllWeatherData()
  }, [fetchAllWeatherData])

  // Save time selection changes
  useEffect(() => {
    saveToStorage({ timeSelection })
  }, [timeSelection])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      const hourMs = 60 * 60 * 1000
      const dayMs = 24 * hourMs

      switch (e.key) {
        case ' ': // Spacebar - play/pause
          e.preventDefault()
          setIsPlaying(prev => !prev)
          break

        case 'ArrowLeft': // Move backward
          e.preventDefault()
          if (e.shiftKey) {
            // Shift + Arrow = move by day
            moveTime(-dayMs)
          } else if (e.ctrlKey || e.metaKey) {
            // Ctrl/Cmd + Arrow = move by week
            moveTime(-7 * dayMs)
          } else {
            // Arrow only = move by hour
            moveTime(-hourMs)
          }
          break

        case 'ArrowRight': // Move forward
          e.preventDefault()
          if (e.shiftKey) {
            // Shift + Arrow = move by day
            moveTime(dayMs)
          } else if (e.ctrlKey || e.metaKey) {
            // Ctrl/Cmd + Arrow = move by week
            moveTime(7 * dayMs)
          } else {
            // Arrow only = move by hour
            moveTime(hourMs)
          }
          break

        case 'ArrowUp': // Expand range (range mode only)
          if (timeSelection.mode === 'range' && timeSelection.range) {
            e.preventDefault()
            const [start, end] = timeSelection.range
            const expansion = e.shiftKey ? dayMs : hourMs
            onTimeSelectionChange({
              mode: 'range',
              range: [Math.max(timeExtent[0], start - expansion), Math.min(timeExtent[1], end + expansion)]
            })
          }
          break

        case 'ArrowDown': // Contract range (range mode only)
          if (timeSelection.mode === 'range' && timeSelection.range) {
            e.preventDefault()
            const [start, end] = timeSelection.range
            const contraction = e.shiftKey ? dayMs : hourMs
            const newStart = start + contraction
            const newEnd = end - contraction
            if (newEnd > newStart) {
              onTimeSelectionChange({
                mode: 'range',
                range: [newStart, newEnd]
              })
            }
          }
          break

        case 'Home': // Go to start of timeline
          e.preventDefault()
          if (timeSelection.mode === 'single') {
            onTimeSelectionChange({ mode: 'single', single: timeExtent[0] })
          } else if (timeSelection.range) {
            const duration = timeSelection.range[1] - timeSelection.range[0]
            onTimeSelectionChange({
              mode: 'range',
              range: [timeExtent[0], timeExtent[0] + duration]
            })
          }
          break

        case 'End': // Go to end of timeline
          e.preventDefault()
          if (timeSelection.mode === 'single') {
            onTimeSelectionChange({ mode: 'single', single: timeExtent[1] })
          } else if (timeSelection.range) {
            const duration = timeSelection.range[1] - timeSelection.range[0]
            onTimeSelectionChange({
              mode: 'range',
              range: [timeExtent[1] - duration, timeExtent[1]]
            })
          }
          break

        case 'r': // Toggle between single and range mode
          e.preventDefault()
          if (timeSelection.mode === 'single' && timeSelection.single) {
            onTimeSelectionChange({
              mode: 'range',
              range: [timeSelection.single - hourMs, timeSelection.single + hourMs]
            })
          } else if (timeSelection.mode === 'range' && timeSelection.range) {
            const center = (timeSelection.range[0] + timeSelection.range[1]) / 2
            onTimeSelectionChange({ mode: 'single', single: center })
          }
          break

        case '?': // Show keyboard help
          e.preventDefault()
          setShowKeyboardHelp(prev => !prev)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [timeSelection, timeExtent, onTimeSelectionChange])

  // Helper function to move time
  const moveTime = useCallback((deltaMs: number) => {
    if (timeSelection.mode === 'single' && timeSelection.single) {
      const newTime = Math.max(timeExtent[0], Math.min(timeExtent[1], timeSelection.single + deltaMs))
      onTimeSelectionChange({ mode: 'single', single: newTime })
    } else if (timeSelection.mode === 'range' && timeSelection.range) {
      const [start, end] = timeSelection.range
      const duration = end - start
      const newStart = Math.max(timeExtent[0], Math.min(timeExtent[1] - duration, start + deltaMs))
      onTimeSelectionChange({
        mode: 'range',
        range: [newStart, newStart + duration]
      })
    }
  }, [timeSelection, timeExtent, onTimeSelectionChange])

  // Handle mouse/touch events for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'start' | 'end' | 'single' | 'range') => {
    e.preventDefault()
    setIsDragging(type)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !timelineRef.current) return

    const rect = timelineRef.current.getBoundingClientRect()
    const position = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const newTime = positionToTime(position)

    if (timeSelection.mode === 'single' && isDragging === 'single') {
      onTimeSelectionChange({ mode: 'single', single: newTime })
    } else if (timeSelection.mode === 'range' && timeSelection.range) {
      if (isDragging === 'start') {
        onTimeSelectionChange({
          mode: 'range',
          range: [Math.min(newTime, timeSelection.range[1] - 60 * 60 * 1000), timeSelection.range[1]]
        })
      } else if (isDragging === 'end') {
        onTimeSelectionChange({
          mode: 'range',
          range: [timeSelection.range[0], Math.max(newTime, timeSelection.range[0] + 60 * 60 * 1000)]
        })
      } else if (isDragging === 'range') {
        const duration = timeSelection.range[1] - timeSelection.range[0]
        const newStart = Math.max(timeExtent[0], Math.min(timeExtent[1] - duration, newTime - duration / 2))
        onTimeSelectionChange({
          mode: 'range',
          range: [newStart, newStart + duration]
        })
      }
    }
  }, [isDragging, timeSelection, positionToTime, onTimeSelectionChange, timeExtent])

  const handleMouseUp = useCallback(() => {
    setIsDragging(null)
  }, [])

  // Handle timeline click
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (isDragging) return

    const rect = timelineRef.current!.getBoundingClientRect()
    const position = ((e.clientX - rect.left) / rect.width) * 100
    const clickedTime = positionToTime(position)

    if (timeSelection.mode === 'single') {
      onTimeSelectionChange({ mode: 'single', single: clickedTime })
    } else if (timeSelection.mode === 'range' && timeSelection.range) {
      const duration = timeSelection.range[1] - timeSelection.range[0]
      const newStart = Math.max(timeExtent[0], Math.min(timeExtent[1] - duration, clickedTime - duration / 2))
      onTimeSelectionChange({
        mode: 'range',
        range: [newStart, newStart + duration]
      })
    }
  }, [isDragging, timeSelection, positionToTime, onTimeSelectionChange, timeExtent])

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Auto-play functionality with smooth animations
  useEffect(() => {
    if (isPlaying) {
      playInterval.current = setInterval(() => {
        const hourMs = 60 * 60 * 1000
        
        if (timeSelection.mode === 'single' && timeSelection.single) {
          const newTime = timeSelection.single + hourMs
          if (newTime > timeExtent[1]) {
            onTimeSelectionChange({ mode: 'single', single: timeExtent[0] })
          } else {
            onTimeSelectionChange({ mode: 'single', single: newTime })
          }
        } else if (timeSelection.mode === 'range' && timeSelection.range) {
          const [start, end] = timeSelection.range
          const duration = end - start
          const newStart = start + hourMs
          
          if (newStart + duration > timeExtent[1]) {
            onTimeSelectionChange({
              mode: 'range',
              range: [timeExtent[0], timeExtent[0] + duration]
            })
          } else {
            onTimeSelectionChange({
              mode: 'range',
              range: [newStart, newStart + duration]
            })
          }
        }
      }, 1000) // Move every second
    } else if (playInterval.current) {
      clearInterval(playInterval.current)
      playInterval.current = null
    }

    return () => {
      if (playInterval.current) {
        clearInterval(playInterval.current)
      }
    }
  }, [isPlaying, timeSelection, timeExtent, onTimeSelectionChange])

  const formatDateTime = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [])

  const formatDateOnly = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }, [])

  const formatTimeOnly = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [])

  // Quick time presets
  const setTimePreset = useCallback((hours: number) => {
    const centerTime = now
    const halfDuration = (hours * 60 * 60 * 1000) / 2
    
    if (hours === 0) {
      // Single point at current time
      onTimeSelectionChange({ mode: 'single', single: centerTime })
    } else {
      // Range centered on current time
      onTimeSelectionChange({
        mode: 'range',
        range: [centerTime - halfDuration, centerTime + halfDuration]
      })
    }
  }, [now, onTimeSelectionChange])

  return (
    <Card className={`m-4 mb-0 ${isMobile ? 'mx-2' : ''}`}>
      <CardHeader className="pb-3">
        <div className={`flex items-center justify-between ${isMobile ? 'flex-col gap-2' : ''}`}>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            30-Day Weather Timeline
            {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />}
          </CardTitle>
          
          <div className={`flex items-center gap-2 ${isMobile ? 'flex-wrap justify-center' : ''}`}>
            {/* Mode Toggle */}
            <div className="flex rounded-lg border p-1">
              <Button
                size="sm"
                variant={timeSelection.mode === 'single' ? 'default' : 'ghost'}
                onClick={() => {
                  if (timeSelection.mode === 'range' && timeSelection.range) {
                    const center = (timeSelection.range[0] + timeSelection.range[1]) / 2
                    onTimeSelectionChange({ mode: 'single', single: center })
                  }
                }}
                className="h-7 px-2 text-xs"
              >
                {isMobile ? 'Point' : 'Single Point'}
              </Button>
              <Button
                size="sm"
                variant={timeSelection.mode === 'range' ? 'default' : 'ghost'}
                onClick={() => {
                  if (timeSelection.mode === 'single' && timeSelection.single) {
                    const hourMs = 60 * 60 * 1000
                    onTimeSelectionChange({
                      mode: 'range',
                      range: [timeSelection.single - hourMs, timeSelection.single + hourMs]
                    })
                  }
                }}
                className="h-7 px-2 text-xs"
              >
                {isMobile ? 'Range' : 'Time Range'}
              </Button>
            </div>

            {/* Keyboard Help */}
            {!isMobile && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
              >
                <Keyboard className="h-4 w-4" />
              </Button>
            )}

            {/* Playback Controls */}
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (timeSelection.mode === 'single') {
                    onTimeSelectionChange({ mode: 'single', single: timeExtent[0] })
                  } else if (timeSelection.range) {
                    const duration = timeSelection.range[1] - timeSelection.range[0]
                    onTimeSelectionChange({
                      mode: 'range',
                      range: [timeExtent[0], timeExtent[0] + duration]
                    })
                  }
                }}
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (timeSelection.mode === 'single') {
                    onTimeSelectionChange({ mode: 'single', single: timeExtent[1] })
                  } else if (timeSelection.range) {
                    const duration = timeSelection.range[1] - timeSelection.range[0]
                    onTimeSelectionChange({
                      mode: 'range',
                      range: [timeExtent[1] - duration, timeExtent[1]]
                    })
                  }
                }}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Keyboard Help Panel */}
        {showKeyboardHelp && !isMobile && (
          <div className="bg-gray-50 rounded-lg p-4 text-sm animate-in slide-in-from-top-2 duration-200">
            <h4 className="font-semibold mb-2">Keyboard Shortcuts:</h4>
            <div className="grid grid-cols-2 gap-2">
              <div><kbd className="px-1 py-0.5 bg-white rounded text-xs">Space</kbd> Play/Pause</div>
              <div><kbd className="px-1 py-0.5 bg-white rounded text-xs">←/→</kbd> Move by hour</div>
              <div><kbd className="px-1 py-0.5 bg-white rounded text-xs">Shift + ←/→</kbd> Move by day</div>
              <div><kbd className="px-1 py-0.5 bg-white rounded text-xs">Ctrl + ←/→</kbd> Move by week</div>
              <div><kbd className="px-1 py-0.5 bg-white rounded text-xs">↑/↓</kbd> Expand/Contract range</div>
              <div><kbd className="px-1 py-0.5 bg-white rounded text-xs">Home/End</kbd> Go to start/end</div>
              <div><kbd className="px-1 py-0.5 bg-white rounded text-xs">R</kbd> Toggle mode</div>
              <div><kbd className="px-1 py-0.5 bg-white rounded text-xs">?</kbd> Show/hide help</div>
            </div>
          </div>
        )}

        {/* Time Selection Display */}
        <div className={`flex items-center justify-between text-sm ${isMobile ? 'flex-col gap-2' : ''}`}>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {timeSelection.mode === 'single' && timeSelection.single && (
              <span className="font-medium">{formatDateTime(timeSelection.single)}</span>
            )}
            {timeSelection.mode === 'range' && timeSelection.range && (
              <>
                <span className="font-medium">{formatDateTime(timeSelection.range[0])}</span>
                <span className="text-muted-foreground">to</span>
                <span className="font-medium">{formatDateTime(timeSelection.range[1])}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {timeSelection.mode === 'range' && timeSelection.range && (
              <Badge variant="secondary">
                {Math.round((timeSelection.range[1] - timeSelection.range[0]) / (60 * 60 * 1000))}h duration
              </Badge>
            )}
            <Badge variant="outline">
              {polygons.length} polygon{polygons.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        {/* Interactive Timeline */}
        <div className="space-y-2">
          <div 
            ref={timelineRef}
            className="relative h-16 bg-gray-50 rounded-lg cursor-pointer select-none"
            onClick={handleTimelineClick}
          >
            <svg className="absolute inset-0 w-full h-full">
              {/* Day markers */}
              {timeSteps.filter((_, i) => i % 24 === 0).map((timestamp) => (
                <line
                  key={timestamp}
                  x1={`${timeToPosition(timestamp)}%`}
                  y1="0"
                  x2={`${timeToPosition(timestamp)}%`}
                  y2="40"
                  stroke="#d1d5db"
                  strokeWidth="1"
                />
              ))}
              
              {/* Current day marker */}
              <line
                x1={`${timeToPosition(now)}%`}
                y1="0"
                x2={`${timeToPosition(now)}%`}
                y2="40"
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray="2,2"
              />
              
              {/* Selected time range/point highlight with animation */}
              {timeSelection.mode === 'single' && timeSelection.single && (
                <line
                  x1={`${timeToPosition(timeSelection.single)}%`}
                  y1="0"
                  x2={`${timeToPosition(timeSelection.single)}%`}
                  y2="40"
                  stroke="#10b981"
                  strokeWidth="3"
                  className="animate-pulse"
                />
              )}
              
              {timeSelection.mode === 'range' && timeSelection.range && (
                <rect
                  x={`${timeToPosition(timeSelection.range[0])}%`}
                  y="0"
                  width={`${timeToPosition(timeSelection.range[1]) - timeToPosition(timeSelection.range[0])}%`}
                  height="40"
                  fill="rgba(59, 130, 246, 0.2)"
                  stroke="#3b82f6"
                  strokeWidth="1"
                  className="transition-all duration-300 ease-in-out"
                />
              )}
            </svg>

            {/* Draggable handles with animations */}
            {timeSelection.mode === 'single' && timeSelection.single && (
              <div
                className="absolute top-1 w-6 h-14 bg-green-600 rounded cursor-ew-resize shadow-lg border-2 border-white hover:bg-green-700 transition-all duration-200 hover:scale-110"
                style={{ left: `calc(${timeToPosition(timeSelection.single)}% - 12px)` }}
                onMouseDown={(e) => handleMouseDown(e, 'single')}
              >
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-green-600 whitespace-nowrap">
                  {formatTimeOnly(timeSelection.single)}
                </div>
              </div>
            )}

            {timeSelection.mode === 'range' && timeSelection.range && (
              <>
                {/* Start handle */}
                <div
                  className="absolute top-1 w-4 h-14 bg-blue-600 rounded cursor-ew-resize shadow-lg border-2 border-white hover:bg-blue-700 transition-all duration-200 hover:scale-110"
                  style={{ left: `calc(${timeToPosition(timeSelection.range[0])}% - 8px)` }}
                  onMouseDown={(e) => handleMouseDown(e, 'start')}
                >
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-blue-600 whitespace-nowrap">
                    {formatTimeOnly(timeSelection.range[0])}
                  </div>
                </div>

                {/* End handle */}
                <div
                  className="absolute top-1 w-4 h-14 bg-blue-600 rounded cursor-ew-resize shadow-lg border-2 border-white hover:bg-blue-700 transition-all duration-200 hover:scale-110"
                  style={{ left: `calc(${timeToPosition(timeSelection.range[1])}% - 8px)` }}
                  onMouseDown={(e) => handleMouseDown(e, 'end')}
                >
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-blue-600 whitespace-nowrap">
                    {formatTimeOnly(timeSelection.range[1])}
                  </div>
                </div>

                {/* Range bar (draggable) */}
                <div
                  className="absolute top-6 h-4 bg-blue-500 opacity-50 cursor-move hover:opacity-70 transition-all duration-200"
                  style={{
                    left: `${timeToPosition(timeSelection.range[0])}%`,
                    width: `${timeToPosition(timeSelection.range[1]) - timeToPosition(timeSelection.range[0])}%`
                  }}
                  onMouseDown={(e) => handleMouseDown(e, 'range')}
                />
              </>
            )}
          </div>

          {/* Time axis labels */}
          <div className="relative h-8 text-xs text-muted-foreground">
            {timeSteps.filter((_, i) => i % (24 * (isMobile ? 3 : 2)) === 0).map((timestamp) => (
              <div
                key={timestamp}
                className="absolute transform -translate-x-1/2"
                style={{ left: `${timeToPosition(timestamp)}%` }}
              >
                <div className="text-center">
                  <div className={timestamp === now ? 'text-red-600 font-semibold' : ''}>
                    {formatDateOnly(timestamp)}
                    {timestamp === now && !isMobile && ' (Today)'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Time Presets */}
        <div className={`flex gap-2 ${isMobile ? 'flex-wrap' : ''}`}>
          <Button size="sm" variant="outline" onClick={() => setTimePreset(0)}>
            Current Hour
          </Button>
          <Button size="sm" variant="outline" onClick={() => setTimePreset(6)}>
            ±3 Hours
          </Button>
          <Button size="sm" variant="outline" onClick={() => setTimePreset(24)}>
            ±12 Hours
          </Button>
          <Button size="sm" variant="outline" onClick={() => setTimePreset(72)}>
            ±1.5 Days
          </Button>
          <Button size="sm" variant="outline" onClick={() => setTimePreset(168)}>
            ±3.5 Days
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
