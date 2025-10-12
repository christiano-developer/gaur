'use client'

import { useMemo } from 'react'
import { Card } from '@/components/ui/card'

interface HeatmapData {
  date: string
  count: number
}

interface ThreatHeatmapProps {
  data: HeatmapData[]
}

export default function ThreatHeatmap({ data }: ThreatHeatmapProps) {
  // Generate last 90 days
  const days = useMemo(() => {
    const result: Array<{ date: Date; count: number; displayDate: string }> = []
    const today = new Date()

    for (let i = 89; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)

      const dateStr = date.toISOString().split('T')[0]
      const dayData = data.find((d) => d.date === dateStr)

      result.push({
        date,
        count: dayData?.count || 0,
        displayDate: dateStr,
      })
    }

    return result
  }, [data])

  // Calculate max count for color intensity
  const maxCount = useMemo(() => {
    return Math.max(...days.map((d) => d.count), 1)
  }, [days])

  // Get color based on count - Light Forest theme
  const getColor = (count: number) => {
    if (count === 0) return 'bg-forest-heatmap-low/30'

    const intensity = count / maxCount
    if (intensity > 0.75) return 'bg-forest-heatmap-high'
    if (intensity > 0.5) return 'bg-forest-heatmap-mid'
    if (intensity > 0.25) return 'bg-forest-accent-primary'
    return 'bg-forest-heatmap-low'
  }

  // Group by weeks
  const weeks = useMemo(() => {
    const result: typeof days[][] = []
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7))
    }
    return result
  }, [days])

  // Get day names
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Threat Activity</h3>
        <p className="text-sm text-gray-600">Last 90 days</p>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-1 mr-2">
              <div className="h-3"></div> {/* Spacer for month labels */}
              {dayNames.map((day) => (
                <div key={day} className="h-3 text-[10px] text-gray-500 flex items-center">
                  {day}
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            <div className="flex gap-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {/* Month label on first day of month */}
                  <div className="h-3 text-[10px] text-gray-500">
                    {week[0]?.date.getDate() === 1
                      ? week[0].date.toLocaleDateString('en-US', { month: 'short' })
                      : ''}
                  </div>

                  {/* Day cells */}
                  {week.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className={`w-3 h-3 rounded-sm ${getColor(day.count)}
                        hover:ring-2 hover:ring-blue-500 cursor-pointer transition-all
                        ${day.count > 0 ? 'hover:scale-150 hover:z-10' : 'hover:scale-125'}
                        relative group`}
                      title={`${day.displayDate}: ${day.count} threat${day.count !== 1 ? 's' : ''}`}
                    >
                      {/* Enhanced tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                        <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap shadow-lg">
                          <div className="font-semibold">{day.displayDate}</div>
                          <div>{day.count} threat{day.count !== 1 ? 's' : ''}</div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend - Light Forest theme */}
          <div className="flex items-center gap-2 mt-4 text-xs text-forest-text-secondary">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-forest-heatmap-low/30 rounded-sm"></div>
              <div className="w-3 h-3 bg-forest-heatmap-low rounded-sm"></div>
              <div className="w-3 h-3 bg-forest-accent-primary rounded-sm"></div>
              <div className="w-3 h-3 bg-forest-heatmap-mid rounded-sm"></div>
              <div className="w-3 h-3 bg-forest-heatmap-high rounded-sm"></div>
            </div>
            <span>More</span>
            <span className="ml-4 text-forest-text-primary">Max: {maxCount} threats/day</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
