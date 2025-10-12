'use client'

import { Card } from '@/components/ui/card'

interface EvidenceStatsProps {
  stats: {
    total_evidence: number
    evidence_by_type: Record<string, number>
    evidence_by_status: Record<string, number>
    recent_collections: number
    court_admissible: number
  }
}

export default function EvidenceStats({ stats }: EvidenceStatsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'collected': return 'text-blue-600'
      case 'analyzed': return 'text-purple-600'
      case 'submitted': return 'text-green-600'
      case 'archived': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'screenshot': return '📸'
      case 'conversation': return '💬'
      case 'profile': return '👤'
      case 'transaction': return '💳'
      case 'image_analysis': return '🔍'
      default: return '📄'
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      {/* Total Evidence */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Total Evidence
        </h3>
        <p className="text-3xl font-bold text-gray-900">
          {stats.total_evidence || 0}
        </p>
      </Card>

      {/* Court Admissible */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Court Admissible
        </h3>
        <p className="text-3xl font-bold text-green-600">
          {stats.court_admissible || 0}
        </p>
      </Card>

      {/* Recent Collections */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Recent (24h)
        </h3>
        <p className="text-3xl font-bold text-blue-600">
          {stats.recent_collections || 0}
        </p>
      </Card>

      {/* Status Breakdown */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          By Status
        </h3>
        <div className="space-y-1">
          {Object.entries(stats.evidence_by_status || {}).map(([status, count]) => (
            <div key={status} className="flex justify-between items-center">
              <span className="text-sm capitalize text-gray-600">{status}:</span>
              <span className={`text-sm font-medium ${getStatusColor(status)}`}>
                {count}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Evidence Types */}
      <Card className="p-4 md:col-span-2">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Evidence Types
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(stats.evidence_by_type || {}).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getTypeIcon(type)}</span>
                <span className="text-sm capitalize text-gray-700">
                  {type.replace('_', ' ')}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {count}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Collection Efficiency */}
      <Card className="p-4 md:col-span-2">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Collection Efficiency
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Court Admissible Rate:</span>
            <span className="text-sm font-medium text-green-600">
              {stats.total_evidence > 0
                ? Math.round((stats.court_admissible / stats.total_evidence) * 100)
                : 0}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Recent Activity:</span>
            <span className="text-sm font-medium text-blue-600">
              {stats.total_evidence > 0
                ? Math.round((stats.recent_collections / stats.total_evidence) * 100)
                : 0}% in 24h
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Processing Rate:</span>
            <span className="text-sm font-medium text-purple-600">
              {stats.evidence_by_status?.analyzed || 0} analyzed
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}