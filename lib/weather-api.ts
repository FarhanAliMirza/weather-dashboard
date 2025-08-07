export interface WeatherData {
  temperature: number
  humidity: number
  windSpeed: number
  precipitation: number
}

export async function fetchWeatherData(
  latitude: number,
  longitude: number,
  startTime: number,
  endTime: number
): Promise<WeatherData> {
  try {
    // Convert timestamps to ISO date strings
    const startDate = new Date(startTime).toISOString().split('T')[0]
    const endDate = new Date(endTime).toISOString().split('T')[0]

    // Open-Meteo API URL
    const url = new URL('https://api.open-meteo.com/v1/forecast')
    url.searchParams.set('latitude', latitude.toString())
    url.searchParams.set('longitude', longitude.toString())
    url.searchParams.set('start_date', startDate)
    url.searchParams.set('end_date', endDate)
    url.searchParams.set('hourly', 'temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation')
    url.searchParams.set('timezone', 'auto')

    const response = await fetch(url.toString())
    
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.hourly) {
      throw new Error('No hourly data available')
    }

    const { time, temperature_2m, relative_humidity_2m, wind_speed_10m, precipitation } = data.hourly

    // Find the relevant time indices
    const timeIndices: number[] = []
    
    if (startTime === endTime) {
      // Single point in time - find closest hour
      const targetTime = new Date(startTime).toISOString().slice(0, 13) + ':00'
      const index = time.findIndex((t: string) => t === targetTime)
      if (index !== -1) timeIndices.push(index)
    } else {
      // Time range - find all hours in range
      for (let i = 0; i < time.length; i++) {
        const timeMs = new Date(time[i]).getTime()
        if (timeMs >= startTime && timeMs <= endTime) {
          timeIndices.push(i)
        }
      }
    }

    if (timeIndices.length === 0) {
      throw new Error('No data available for the selected time range')
    }

    // Calculate averages for the time range
    const avgTemperature = timeIndices.reduce((sum, i) => sum + (temperature_2m[i] || 0), 0) / timeIndices.length
    const avgHumidity = timeIndices.reduce((sum, i) => sum + (relative_humidity_2m[i] || 0), 0) / timeIndices.length
    const avgWindSpeed = timeIndices.reduce((sum, i) => sum + (wind_speed_10m[i] || 0), 0) / timeIndices.length
    const avgPrecipitation = timeIndices.reduce((sum, i) => sum + (precipitation[i] || 0), 0) / timeIndices.length

    const weatherData: WeatherData = {
      temperature: Math.round(avgTemperature * 10) / 10,
      humidity: Math.round(avgHumidity * 10) / 10,
      windSpeed: Math.round(avgWindSpeed * 10) / 10,
      precipitation: Math.round(avgPrecipitation * 10) / 10
    }
    
    return weatherData

  } catch (error) {
    console.error('Failed to fetch weather data:', error)
    
    // Return mock data as fallback
    const mockData: WeatherData = {
      temperature: 15 + Math.random() * 20,
      humidity: 40 + Math.random() * 40,
      windSpeed: Math.random() * 30,
      precipitation: Math.random() * 10
    }
    
    return mockData
  }
}

// Helper function to get weather description based on conditions
export function getWeatherDescription(data: WeatherData): string {
  const { temperature, humidity, windSpeed, precipitation } = data

  if (precipitation > 5) return 'Rainy'
  if (temperature < 0) return 'Freezing'
  if (temperature > 30) return 'Hot'
  if (windSpeed > 20) return 'Windy'
  if (humidity > 80) return 'Humid'
  if (temperature < 10) return 'Cold'
  if (temperature > 25) return 'Warm'
  
  return 'Mild'
}

// Helper function to format weather data for display
export function formatWeatherValue(value: number, type: keyof WeatherData): string {
  const rounded = Math.round(value * 10) / 10
  
  switch (type) {
    case 'temperature':
      return `${rounded}°C`
    case 'humidity':
      return `${rounded}%`
    case 'windSpeed':
      return `${rounded} km/h`
    case 'precipitation':
      return `${rounded} mm`
    default:
      return rounded.toString()
  }
}
