'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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

interface ThreatCardProps {
  threat: Threat
  onAssign: (threatId: number, officerBadge: string) => void
  onUpdateStatus: (threatId: number, status: string, notes?: string) => void
}

export default function ThreatCard({ threat, onAssign, onUpdateStatus }: ThreatCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [showStatusForm, setShowStatusForm] = useState(false)
  const [officerBadge, setOfficerBadge] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [notes, setNotes] = useState('')

  const getSeverityColor = (level: string) => {
    switch (level) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'MEDIUM':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'LOW':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'investigating':
        return 'bg-blue-100 text-blue-800'
      case 'resolved':
        return 'bg-green-100 text-green-800'
      case 'escalated':
        return 'bg-red-100 text-red-800'
      case 'closed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const handleAssign = () => {
    if (officerBadge.trim()) {
      onAssign(threat.id, officerBadge.trim())
      setOfficerBadge('')
      setShowAssignForm(false)
    }
  }

  const handleStatusUpdate = () => {
    if (newStatus) {
      onUpdateStatus(threat.id, newStatus, notes.trim() || undefined)
      setNewStatus('')
      setNotes('')
      setShowStatusForm(false)
    }
  }

  return (
    <Card className={`p-6 border-l-4 forest-card-gradient ${getSeverityColor(threat.risk_level)}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(threat.risk_level)}`}>
              {threat.risk_level} RISK
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(threat.status)}`}>
              {threat.status.toUpperCase()}
            </span>
            <span className="text-xs text-forest-text-secondary">
              ID: {threat.id}
            </span>
          </div>

          <h3 className="text-lg font-semibold text-forest-text-primary mb-1">
            {threat.fraud_type.replace(/_/g, ' ').toUpperCase()}
          </h3>

          <div className="flex items-center space-x-4 text-sm text-forest-text-secondary">
            <span>Platform: {threat.source_platform}</span>
            <span>•</span>
            <span>Confidence: {(threat.confidence_score * 100).toFixed(1)}%</span>
          </div>

          <p className="text-sm text-forest-text-secondary mt-2 line-clamp-2">
            {threat.content_text}
          </p>
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            variant="outline"
            size="sm"
          >
            {isExpanded ? 'Less' : 'Details'}
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="mb-4">
        <p className="text-sm text-forest-text-secondary">
          Created: {formatDate(threat.created_at)}
        </p>
        <p className="text-sm text-forest-text-secondary">
          Source ID: {threat.source_id}
        </p>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="space-y-4 border-t border-forest-border pt-4">
          {/* Full Content */}
          <div>
            <p className="text-sm font-medium text-forest-text-primary mb-1">Full Content</p>
            <p className="text-sm text-forest-text-secondary whitespace-pre-wrap">{threat.content_text}</p>
          </div>

          {/* Fraud Score */}
          <div>
            <p className="text-sm font-medium text-forest-text-primary mb-1">Confidence Score</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  threat.confidence_score >= 0.8 ? 'bg-red-500' :
                  threat.confidence_score >= 0.6 ? 'bg-orange-500' : 'bg-yellow-500'
                }`}
                style={{ width: `${threat.confidence_score * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {(threat.confidence_score * 100).toFixed(1)}%
            </p>
          </div>

          {/* Keywords */}
          {threat.detected_keywords && threat.detected_keywords.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Detected Keywords</p>
              <div className="flex flex-wrap gap-2">
                {threat.detected_keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Metadata */}
          {threat.ai_metadata && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">AI Analysis</p>
              <div className="text-xs text-gray-600 space-y-1">
                {threat.ai_metadata.username && (
                  <p><strong>Username:</strong> {threat.ai_metadata.username}</p>
                )}
                {threat.ai_metadata.language && (
                  <p><strong>Language:</strong> {threat.ai_metadata.language}</p>
                )}
                {threat.ai_metadata.reasoning && (
                  <p><strong>Reasoning:</strong> {threat.ai_metadata.reasoning}</p>
                )}
                {threat.ai_metadata.red_flags && threat.ai_metadata.red_flags.length > 0 && (
                  <div>
                    <strong>Red Flags:</strong>
                    <ul className="list-disc list-inside ml-2">
                      {threat.ai_metadata.red_flags.map((flag: string, i: number) => (
                        <li key={i}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <Button
              onClick={() => setShowStatusForm(!showStatusForm)}
              variant="outline"
              size="sm"
            >
              Update Status
            </Button>

            {threat.status === 'open' && (
              <Button
                onClick={() => onUpdateStatus(threat.id, 'investigating')}
                size="sm"
              >
                Start Investigation
              </Button>
            )}

            {threat.status === 'investigating' && (
              <>
                <Button
                  onClick={() => onUpdateStatus(threat.id, 'resolved')}
                  variant="outline"
                  size="sm"
                >
                  Mark Resolved
                </Button>
              </>
            )}
          </div>

          {/* Status Update Form */}
          {showStatusForm && (
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Update Status</h4>
              <div className="space-y-2">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Select new status</option>
                  <option value="pending">Pending</option>
                  <option value="investigating">Investigating</option>
                  <option value="resolved">Resolved</option>
                  <option value="escalated">Escalated</option>
                  <option value="closed">Closed</option>
                </select>

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes (optional)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />

                <div className="flex space-x-2">
                  <Button onClick={handleStatusUpdate} size="sm">
                    Update
                  </Button>
                  <Button
                    onClick={() => setShowStatusForm(false)}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}