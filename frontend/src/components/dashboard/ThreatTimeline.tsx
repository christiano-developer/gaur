'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api'
import ThreatCard from './ThreatCard'
import ThreatFilters from './ThreatFilters'
import ThreatHeatmap from './ThreatHeatmap'

interface Threat {
  id: number
  source_platform: string
  source_id: string
  content_text: string
  confidence_score: number
  risk_level: string
  fraud_type: string
  detected_keywords: string[]
  ai_metadata: any
  status: string
  created_at: string
  resolved_at: string | null
}

interface ThreatTimelineProps {
  onStatsUpdate?: (stats: any) => void
}

export default function ThreatTimeline({ onStatsUpdate }: ThreatTimelineProps) {
  const [threats, setThreats] = useState<Threat[]>([])
  const [heatmapData, setHeatmapData] = useState<Array<{ date: string; count: number }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [filters, setFilters] = useState({
    status: 'open',
    risk_level: '',
    fraud_type: ''
  })

  // Auto-refresh every 30 seconds
  useEffect(() => {
    loadThreats()
    const interval = setInterval(loadThreats, 30000)
    return () => clearInterval(interval)
  }, [page, filters])

  const loadThreats = async () => {
    try {
      setError(null)
      const token = localStorage.getItem('gaur_access_token')

      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        size: '10'
      })

      // Add filters if they exist
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value)
        }
      })

      const response = await fetch(`http://localhost:8000/api/v1/threats?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setThreats(result.data.threats || [])
          const pagination = result.data.pagination || {}
          setTotalPages(pagination.total_pages || 1)
          setHasNext(pagination.page < pagination.total_pages)

          // Update stats if callback provided
          if (onStatsUpdate) {
            loadStats()
          }
        }
      } else {
        setError('Failed to load threats')
      }
    } catch (error) {
      console.error('Failed to load threats:', error)
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('gaur_access_token')
      const response = await fetch('http://localhost:8000/api/v1/threats/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Stats API response:', result)
        if (result.success && result.data) {
          // Update stats in parent
          onStatsUpdate?.(result.data)

          // Update heatmap data
          if (result.data.heatmap) {
            console.log('Heatmap data:', result.data.heatmap)
            setHeatmapData(result.data.heatmap)
          } else {
            console.log('No heatmap data in response')
          }
        }
      } else {
        console.error('Stats API failed:', response.status)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleAssignThreat = async (threatId: number, officerBadge: string) => {
    try {
      const token = localStorage.getItem('gaur_access_token')
      const response = await fetch(`http://localhost:8000/api/v1/threats/${threatId}/assign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          officer_badge: officerBadge,
          status: 'investigating'
        }),
      })

      if (response.ok) {
        // Refresh threats
        loadThreats()
      } else {
        setError('Failed to assign threat')
      }
    } catch (error) {
      console.error('Failed to assign threat:', error)
      setError('Network error occurred')
    }
  }

  const handleUpdateStatus = async (threatId: number, status: string, notes?: string) => {
    try {
      const token = localStorage.getItem('gaur_access_token')
      const response = await fetch(`http://localhost:8000/api/v1/threats/${threatId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          notes
        }),
      })

      if (response.ok) {
        // Refresh threats
        loadThreats()
      } else {
        setError('Failed to update threat status')
      }
    } catch (error) {
      console.error('Failed to update threat status:', error)
      setError('Network error occurred')
    }
  }

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters)
    setPage(1) // Reset to first page when filters change
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  if (loading && threats.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Loading threats...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Heatmap */}
      {heatmapData.length > 0 && (
        <ThreatHeatmap data={heatmapData} />
      )}

      {/* Filter Controls */}
      <ThreatFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onRefresh={loadThreats}
      />

      {/* Error Display */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="text-red-600">{error}</p>
          <Button
            onClick={loadThreats}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Retry
          </Button>
        </Card>
      )}

      {/* Threat List */}
      <div className="space-y-4">
        {threats.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-600">No threats found matching your criteria.</p>
          </Card>
        ) : (
          threats.map((threat) => (
            <ThreatCard
              key={threat.id}
              threat={threat}
              onAssign={handleAssignThreat}
              onUpdateStatus={handleUpdateStatus}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4 py-4">
          <Button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            variant="outline"
          >
            Previous
          </Button>

          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>

          <Button
            onClick={() => handlePageChange(page + 1)}
            disabled={!hasNext}
            variant="outline"
          >
            Next
          </Button>
        </div>
      )}

      {/* Auto-refresh indicator */}
      {loading && threats.length > 0 && (
        <div className="text-center py-2">
          <p className="text-sm text-gray-500">
            <span className="inline-block animate-pulse">●</span> Auto-refreshing...
          </p>
        </div>
      )}
    </div>
  )
}