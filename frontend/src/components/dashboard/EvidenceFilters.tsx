'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface EvidenceFiltersProps {
  filters: {
    case_number: string
    evidence_type: string
    legal_status: string
  }
  onFilterChange: (filters: any) => void
  onRefresh: () => void
}

export default function EvidenceFilters({
  filters,
  onFilterChange,
  onRefresh
}: EvidenceFiltersProps) {
  const [localFilters, setLocalFilters] = useState(filters)

  const handleFilterUpdate = (key: string, value: string) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleClearFilters = () => {
    const clearedFilters = {
      case_number: '',
      evidence_type: '',
      legal_status: ''
    }
    setLocalFilters(clearedFilters)
    onFilterChange(clearedFilters)
  }

  const hasActiveFilters = Object.values(localFilters).some(value => value !== '')

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Evidence Filters
        </h3>
        <div className="flex space-x-2">
          <Button
            onClick={onRefresh}
            variant="outline"
            size="sm"
          >
            🔄 Refresh
          </Button>
          {hasActiveFilters && (
            <Button
              onClick={handleClearFilters}
              variant="outline"
              size="sm"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Case Number Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Case Number
          </label>
          <Input
            type="text"
            placeholder="Enter case number..."
            value={localFilters.case_number}
            onChange={(e) => handleFilterUpdate('case_number', e.target.value)}
            className="text-sm"
          />
        </div>

        {/* Evidence Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Evidence Type
          </label>
          <select
            value={localFilters.evidence_type}
            onChange={(e) => handleFilterUpdate('evidence_type', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded text-sm"
          >
            <option value="">All types</option>
            <option value="screenshot">Screenshot</option>
            <option value="conversation">Conversation</option>
            <option value="profile">Profile</option>
            <option value="transaction">Transaction</option>
            <option value="image_analysis">Image Analysis</option>
          </select>
        </div>

        {/* Legal Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Legal Status
          </label>
          <select
            value={localFilters.legal_status}
            onChange={(e) => handleFilterUpdate('legal_status', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded text-sm"
          >
            <option value="">All statuses</option>
            <option value="collected">Collected</option>
            <option value="analyzed">Analyzed</option>
            <option value="submitted">Submitted</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Search Actions */}
        <div className="flex items-end">
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Actions
            </label>
            <div className="flex space-x-2">
              <Button
                onClick={() => {/* Could add export functionality */}}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                📤 Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center space-x-2 flex-wrap">
            <span className="text-sm text-gray-600">Active filters:</span>
            {localFilters.case_number && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                Case: {localFilters.case_number}
                <button
                  onClick={() => handleFilterUpdate('case_number', '')}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ✕
                </button>
              </span>
            )}
            {localFilters.evidence_type && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                Type: {localFilters.evidence_type}
                <button
                  onClick={() => handleFilterUpdate('evidence_type', '')}
                  className="ml-1 text-green-600 hover:text-green-800"
                >
                  ✕
                </button>
              </span>
            )}
            {localFilters.legal_status && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                Status: {localFilters.legal_status}
                <button
                  onClick={() => handleFilterUpdate('legal_status', '')}
                  className="ml-1 text-purple-600 hover:text-purple-800"
                >
                  ✕
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}