"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, SkipBack, SkipForward, Clock, Calendar } from 'lucide-react'
import type { DataPoint } from "@/app/page"

interface TimelineProps {
  timeRange: [number, number]
  onTimeRangeChange: (range: [number, number]) => void
  data: DataPoint[]
}

export function Timeline({ timeRange, onTimeRangeChange, data }: TimelineProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'range' | null>(null)
  const [sliderMode, setSliderMode] = useState<'single' | 'range'>('range')
  const timelineRef = useRef<HTMLDivElement>(null)
  const playInterval = useRef<NodeJS.Timeout | null>(null)

  // Calculate time extent from data with hourly resolution
  const timeExtent = useMemo(() => {
    if (data.length === 0) {
      const now = Date.now()
      return [now - 7 * 24 * 3600000, now] // Last 7 days
    }
    
    const timestamps = data.map(d => d.timestamp)
    const minTime = Math.min(...timestamps)
    const maxTime = Math.max(...timestamps)
    
    // Round to nearest hour
    const roundedMin = Math.floor(minTime / 3600000) * 3600000
    const roundedMax = Math.ceil(maxTime / 3600000) * 3600000
    
    return [roundedMin, roundedMax]
  }, [data])

  // Generate hourly time steps for visualization
  const timeSteps = useMemo(() => {
    const [start, end] = timeExtent
    const steps = []
    const hourMs = 3600000 // 1 hour in milliseconds
    
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
    return Math.round(timestamp / 3600000) * 3600000
  }, [timeExtent])

  // Get data count for each hour
  const getDataCountAtTime = useCallback((timestamp: number) => {
    const hourMs = 3600000
    return data.filter(d => 
      Math.abs(d.timestamp - timestamp) < hourMs / 2
    ).length
  }, [data])

  // Handle mouse/touch events for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'start' | 'end' | 'range') => {
    e.preventDefault()
    setIsDragging(type)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !timelineRef.current) return

    const rect = timelineRef.current.getBoundingClientRect()
    const position = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const newTime = positionToTime(position)

    if (sliderMode === 'single') {
      // Single handle mode - move both start and end together
      const duration = timeRange[1] - timeRange[0]
      onTimeRangeChange([newTime, newTime + duration])
    } else {
      // Range mode
      if (isDragging === 'start') {
        onTimeRangeChange([Math.min(newTime, timeRange[1] - 3600000), timeRange[1]])
      } else if (isDragging === 'end') {
        onTimeRangeChange([timeRange[0], Math.max(newTime, timeRange[0] + 3600000)])
      } else if (isDragging === 'range') {
        const duration = timeRange[1] - timeRange[0]
        const newStart = Math.max(timeExtent[0], Math.min(timeExtent[1] - duration, newTime - duration / 2))
        onTimeRangeChange([newStart, newStart + duration])
      }
    }
  }, [isDragging, sliderMode, timeRange, positionToTime, onTimeRangeChange, timeExtent])

  const handleMouseUp = useCallback(() => {
    setIsDragging(null)
  }, [])

  // Handle timeline click
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (isDragging) return

    const rect = timelineRef.current!.getBoundingClientRect()
    const position = ((e.clientX - rect.left) / rect.width) * 100
    const clickedTime = positionToTime(position)

    if (sliderMode === 'single') {
      const duration = timeRange[1] - timeRange[0]
      onTimeRangeChange([clickedTime, clickedTime + duration])
    } else {
      // In range mode, click sets the center of the range
      const duration = timeRange[1] - timeRange[0]
      const newStart = Math.max(timeExtent[0], Math.min(timeExtent[1] - duration, clickedTime - duration / 2))
      onTimeRangeChange([newStart, newStart + duration])
    }
  }, [isDragging, sliderMode, timeRange, positionToTime, onTimeRangeChange, timeExtent])

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

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying) {
      playInterval.current = setInterval(() => {
        const duration = timeRange[1] - timeRange[0]
        const step = 3600000 // 1 hour
        const newStart = timeRange[0] + step
        
        if (newStart + duration > timeExtent[1]) {
          // Reset to beginning
          onTimeRangeChange([timeExtent[0], timeExtent[0] + duration])
        } else {
          onTimeRangeChange([newStart, newStart + duration])
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
  }, [isPlaying, timeRange, timeExtent, onTimeRangeChange])

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

  // Quick time range presets
  const setTimeRange = useCallback((hours: number) => {
    const now = Date.now()
    const start = now - hours * 3600000
    onTimeRangeChange([Math.max(timeExtent[0], start), Math.min(timeExtent[1], now)])
  }, [timeExtent, onTimeRangeChange])

  const maxDataCount = Math.max(...timeSteps.map(getDataCountAtTime))

  return (
    <Card className="m-4 mb-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Timeline Controls
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Slider Mode Toggle */}
            <div className="flex rounded-lg border p-1">
              <Button
                size="sm"
                variant={sliderMode === 'single' ? 'default' : 'ghost'}
                onClick={() => setSliderMode('single')}
                className="h-7 px-2 text-xs"
              >
                Single
              </Button>
              <Button
                size="sm"
                variant={sliderMode === 'range' ? 'default' : 'ghost'}
                onClick={() => setSliderMode('range')}
                className="h-7 px-2 text-xs"
              >
                Range
              </Button>
            </div>

            {/* Playback Controls */}
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onTimeRangeChange([timeExtent[0], timeExtent[0] + (timeRange[1] - timeRange[0])])}
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
                onClick={() => onTimeRangeChange([timeExtent[1] - (timeRange[1] - timeRange[0]), timeExtent[1]])}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Time Range Display */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{formatDateTime(timeRange[0])}</span>
            <span className="text-muted-foreground">to</span>
            <span className="font-medium">{formatDateTime(timeRange[1])}</span>
          </div>
          <Badge variant="secondary">
            {Math.round((timeRange[1] - timeRange[0]) / 3600000)}h duration
          </Badge>
        </div>

        {/* Interactive Timeline */}
        <div className="space-y-2">
          <div 
            ref={timelineRef}
            className="relative h-16 bg-gray-50 rounded-lg cursor-pointer select-none"
            onClick={handleTimelineClick}
          >
            {/* Data density bars */}
            <svg className="absolute inset-0 w-full h-full">
              {timeSteps.map((timestamp, index) => {
                const count = getDataCountAtTime(timestamp)
                const height = maxDataCount > 0 ? (count / maxDataCount) * 40 : 0
                const x = timeToPosition(timestamp)
                
                return (
                  <rect
                    key={timestamp}
                    x={`${x}%`}
                    y={40 - height}
                    width="2"
                    height={height}
                    fill="#e5e7eb"
                    className="hover:fill-blue-200"
                  />
                )
              })}
              
              {/* Selected time range highlight */}
              <rect
                x={`${timeToPosition(timeRange[0])}%`}
                y="0"
                width={`${timeToPosition(timeRange[1]) - timeToPosition(timeRange[0])}%`}
                height="40"
                fill="rgba(59, 130, 246, 0.2)"
                stroke="#3b82f6"
                strokeWidth="1"
              />
            </svg>

            {/* Range handles */}
            {sliderMode === 'range' && (
              <>
                {/* Start handle */}
                <div
                  className="absolute top-1 w-4 h-14 bg-blue-600 rounded cursor-ew-resize shadow-lg border-2 border-white hover:bg-blue-700 transition-colors"
                  style={{ left: `calc(${timeToPosition(timeRange[0])}% - 8px)` }}
                  onMouseDown={(e) => handleMouseDown(e, 'start')}
                >
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-blue-600 whitespace-nowrap">
                    {formatTimeOnly(timeRange[0])}
                  </div>
                </div>

                {/* End handle */}
                <div
                  className="absolute top-1 w-4 h-14 bg-blue-600 rounded cursor-ew-resize shadow-lg border-2 border-white hover:bg-blue-700 transition-colors"
                  style={{ left: `calc(${timeToPosition(timeRange[1])}% - 8px)` }}
                  onMouseDown={(e) => handleMouseDown(e, 'end')}
                >
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-blue-600 whitespace-nowrap">
                    {formatTimeOnly(timeRange[1])}
                  </div>
                </div>

                {/* Range bar (draggable) */}
                <div
                  className="absolute top-6 h-4 bg-blue-500 opacity-50 cursor-move hover:opacity-70 transition-opacity"
                  style={{
                    left: `${timeToPosition(timeRange[0])}%`,
                    width: `${timeToPosition(timeRange[1]) - timeToPosition(timeRange[0])}%`
                  }}
                  onMouseDown={(e) => handleMouseDown(e, 'range')}
                />
              </>
            )}

            {/* Single handle mode */}
            {sliderMode === 'single' && (
              <div
                className="absolute top-1 w-6 h-14 bg-green-600 rounded cursor-ew-resize shadow-lg border-2 border-white hover:bg-green-700 transition-colors"
                style={{ left: `calc(${timeToPosition((timeRange[0] + timeRange[1]) / 2)}% - 12px)` }}
                onMouseDown={(e) => handleMouseDown(e, 'range')}
              >
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-green-600 whitespace-nowrap">
                  {formatTimeOnly((timeRange[0] + timeRange[1]) / 2)}
                </div>
              </div>
            )}
          </div>

          {/* Time axis labels */}
          <div className="relative h-6 text-xs text-muted-foreground">
            {timeSteps.filter((_, i) => i % Math.max(1, Math.floor(timeSteps.length / 8)) === 0).map((timestamp) => (
              <div
                key={timestamp}
                className="absolute transform -translate-x-1/2"
                style={{ left: `${timeToPosition(timestamp)}%` }}
              >
                <div className="text-center">
                  <div>{formatDateOnly(timestamp)}</div>
                  <div className="text-xs opacity-75">{formatTimeOnly(timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Time Range Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTimeRange(1)}
          >
            Last Hour
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTimeRange(6)}
          >
            Last 6h
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTimeRange(24)}
          >
            Last 24h
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTimeRange(72)}
          >
            Last 3 days
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTimeRange(168)}
          >
            Last week
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onTimeRangeChange([timeExtent[0], timeExtent[1]])}
          >
            All time
          </Button>
        </div>

        {/* Statistics */}
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Data points in range: {data.filter(d => d.timestamp >= timeRange[0] && d.timestamp <= timeRange[1]).length}</span>
          <span>Total data points: {data.length}</span>
        </div>
      </CardContent>
    </Card>
  )
}
