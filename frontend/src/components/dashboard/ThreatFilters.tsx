'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Filters {
  status: string
  alert_level: string
  platform: string
  assigned_officer: string
}

interface ThreatFiltersProps {
  filters: Filters
  onFilterChange: (filters: Filters) => void
  onRefresh: () => void
}

export default function ThreatFilters({ filters, onFilterChange, onRefresh }: ThreatFiltersProps) {
  const handleFilterChange = (key: keyof Filters, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value
    })
  }

  const clearFilters = () => {
    onFilterChange({
      status: '',
      alert_level: '',
      platform: '',
      assigned_officer: ''
    })
  }

  const hasActiveFilters = Object.values(filters).some(value => value !== '')

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Filter Threats
        </h3>

        {/* Status Filter */}
        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm min-w-32"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="escalated">Escalated</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Alert Level Filter */}
        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-1">Priority</label>
          <select
            value={filters.alert_level}
            onChange={(e) => handleFilterChange('alert_level', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm min-w-32"
          >
            <option value="">All Priorities</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {/* Platform Filter */}
        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-1">Platform</label>
          <select
            value={filters.platform}
            onChange={(e) => handleFilterChange('platform', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm min-w-32"
          >
            <option value="">All Platforms</option>
            <option value="Facebook">Facebook</option>
            <option value="Instagram">Instagram</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Google">Google</option>
            <option value="Email">Email</option>
            <option value="Twitter">Twitter</option>
            <option value="Telegram">Telegram</option>
          </select>
        </div>

        {/* Assigned Officer Filter */}
        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-1">Assigned Officer</label>
          <input
            type="text"
            value={filters.assigned_officer}
            onChange={(e) => handleFilterChange('assigned_officer', e.target.value)}
            placeholder="Badge number"
            className="px-3 py-2 border border-gray-300 rounded-md text-sm min-w-32"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col justify-end">
          <div className="flex space-x-2">
            <Button
              onClick={onRefresh}
              variant="outline"
              size="sm"
            >
              Refresh
            </Button>

            {hasActiveFilters && (
              <Button
                onClick={clearFilters}
                variant="outline"
                size="sm"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-gray-600 mb-2">Active filters:</p>
          <div className="flex flex-wrap gap-2">
            {filters.status && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Status: {filters.status}
                <button
                  onClick={() => handleFilterChange('status', '')}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )}

            {filters.alert_level && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Priority: {filters.alert_level}
                <button
                  onClick={() => handleFilterChange('alert_level', '')}
                  className="ml-1 text-red-600 hover:text-red-800"
                >
                  ×
                </button>
              </span>
            )}

            {filters.platform && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Platform: {filters.platform}
                <button
                  onClick={() => handleFilterChange('platform', '')}
                  className="ml-1 text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </span>
            )}

            {filters.assigned_officer && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Officer: {filters.assigned_officer}
                <button
                  onClick={() => handleFilterChange('assigned_officer', '')}
                  className="ml-1 text-purple-600 hover:text-purple-800"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}