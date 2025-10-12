'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import EvidenceCard from './EvidenceCard'
import EvidenceFilters from './EvidenceFilters'

interface Evidence {
  id: number
  alert_id: number
  case_number: string | null
  evidence_type: string
  evidence_data: any
  evidence_hash: string
  collected_by: string
  collection_timestamp: string
  legal_status: string
  court_admissible: boolean
  updated_at: string
  fraud_type: string | null
  alert_level: string | null
  custody_entries: number
}

interface EvidenceListProps {
  onStatsUpdate?: (stats: any) => void
}

export default function EvidenceList({ onStatsUpdate }: EvidenceListProps) {
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [filters, setFilters] = useState({
    case_number: '',
    evidence_type: '',
    legal_status: ''
  })

  // Auto-refresh every 60 seconds (less frequent than threats)
  useEffect(() => {
    loadEvidence()
    const interval = setInterval(loadEvidence, 60000)
    return () => clearInterval(interval)
  }, [page, filters])

  const loadEvidence = async () => {
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

      const response = await fetch(`http://localhost:8000/api/v1/evidence?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setEvidence(data.items)
        setTotalPages(data.pages)
        setHasNext(data.has_next)

        // Update stats if callback provided
        if (onStatsUpdate) {
          loadStats()
        }
      } else {
        setError('Failed to load evidence')
      }
    } catch (error) {
      console.error('Failed to load evidence:', error)
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('gaur_access_token')
      const response = await fetch('http://localhost:8000/api/v1/evidence/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const stats = await response.json()
        onStatsUpdate?.(stats)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleCreateEvidence = async (alertId: number, evidenceType: string, evidenceData: any) => {
    try {
      const token = localStorage.getItem('gaur_access_token')
      const response = await fetch('http://localhost:8000/api/v1/evidence', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alert_id: alertId,
          evidence_type: evidenceType,
          evidence_data: evidenceData
        }),
      })

      if (response.ok) {
        // Refresh evidence list
        loadEvidence()
      } else {
        setError('Failed to create evidence')
      }
    } catch (error) {
      console.error('Failed to create evidence:', error)
      setError('Network error occurred')
    }
  }

  const handleAddCustodyEntry = async (evidenceId: number, action: string, notes?: string) => {
    try {
      const token = localStorage.getItem('gaur_access_token')
      const response = await fetch(`http://localhost:8000/api/v1/evidence/${evidenceId}/custody`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          notes
        }),
      })

      if (response.ok) {
        // Refresh evidence list
        loadEvidence()
      } else {
        setError('Failed to add custody entry')
      }
    } catch (error) {
      console.error('Failed to add custody entry:', error)
      setError('Network error occurred')
    }
  }

  const handleVerifyEvidence = async (evidenceId: number) => {
    try {
      const token = localStorage.getItem('gaur_access_token')
      const response = await fetch(`http://localhost:8000/api/v1/evidence/${evidenceId}/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const result = await response.json()
        // Show verification result (you could use a modal or notification)
        alert(`Evidence integrity: ${result.valid ? 'Valid' : 'Invalid'}\nContent: ${result.content_integrity}\nSignatures: ${result.signature_integrity}`)
      } else {
        setError('Failed to verify evidence')
      }
    } catch (error) {
      console.error('Failed to verify evidence:', error)
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

  if (loading && evidence.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Loading evidence...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <EvidenceFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onRefresh={loadEvidence}
      />

      {/* Error Display */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="text-red-600">{error}</p>
          <Button
            onClick={loadEvidence}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Retry
          </Button>
        </Card>
      )}

      {/* Evidence List */}
      <div className="space-y-4">
        {evidence.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-600">No evidence found matching your criteria.</p>
          </Card>
        ) : (
          evidence.map((evidenceItem) => (
            <EvidenceCard
              key={evidenceItem.id}
              evidence={evidenceItem}
              onAddCustodyEntry={handleAddCustodyEntry}
              onVerifyIntegrity={handleVerifyEvidence}
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
      {loading && evidence.length > 0 && (
        <div className="text-center py-2">
          <p className="text-sm text-gray-500">
            <span className="inline-block animate-pulse">●</span> Auto-refreshing...
          </p>
        </div>
      )}
    </div>
  )
}