'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'

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

interface EvidenceCardProps {
  evidence: Evidence
  onAddCustodyEntry: (evidenceId: number, action: string, notes?: string) => void
  onVerifyIntegrity: (evidenceId: number) => void
}

export default function EvidenceCard({
  evidence,
  onAddCustodyEntry,
  onVerifyIntegrity
}: EvidenceCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [custodyAction, setCustodyAction] = useState('')
  const [custodyNotes, setCustodyNotes] = useState('')
  const [showCustodyForm, setShowCustodyForm] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'collected': return 'bg-blue-100 text-blue-800'
      case 'analyzed': return 'bg-purple-100 text-purple-800'
      case 'submitted': return 'bg-green-100 text-green-800'
      case 'archived': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
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

  const getAlertLevelColor = (level: string | null) => {
    if (!level) return 'bg-gray-100 text-gray-800'
    switch (level.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const handleCustodySubmit = () => {
    if (custodyAction) {
      onAddCustodyEntry(evidence.id, custodyAction, custodyNotes || undefined)
      setCustodyAction('')
      setCustodyNotes('')
      setShowCustodyForm(false)
    }
  }

  const parseEvidenceData = (evidenceData: any) => {
    // If it's already an object, return as is
    if (typeof evidenceData === 'object' && evidenceData !== null) {
      return evidenceData
    }

    // If it's a string, try to parse as JSON
    if (typeof evidenceData === 'string') {
      try {
        return JSON.parse(evidenceData)
      } catch (e) {
        // If parsing fails, return the string as fallback
        return { raw_content: evidenceData }
      }
    }

    return evidenceData
  }

  const getEvidencePreview = (evidenceData: any) => {
    const parsedData = parseEvidenceData(evidenceData)

    // Handle legacy string data that couldn't be parsed
    if (parsedData.raw_content) {
      return parsedData.raw_content.substring(0, 100) + (parsedData.raw_content.length > 100 ? '...' : '')
    }

    // Screenshot evidence
    if (parsedData?.original_content?.text) {
      const text = parsedData.original_content.text.substring(0, 120)
      const platform = parsedData.original_content.platform || 'Unknown'
      const fraudScore = parsedData.fraud_score ? ` • Fraud: ${Math.round(parsedData.fraud_score * 100)}%` : ''
      return `📱 ${platform.toUpperCase()}: "${text}${text.length >= 120 ? '...' : ''}"${fraudScore}`
    }

    // Conversation evidence
    if (parsedData?.original_content?.conversation) {
      const conv = parsedData.original_content.conversation
      const platform = parsedData.original_content.platform || 'Unknown'
      const participantCount = parsedData.original_content.participants?.length || 2
      const fraudScore = parsedData.fraud_score ? ` • Fraud: ${Math.round(parsedData.fraud_score * 100)}%` : ''
      return `💬 ${platform.toUpperCase()}: Conversation between ${participantCount} participants (${conv.length} messages)${fraudScore}`
    }

    // Profile evidence
    if (parsedData?.original_content?.profile_info) {
      const profile = parsedData.original_content.profile_info
      const platform = parsedData.original_content.platform || 'Unknown'
      const followers = profile.followers ? ` • ${profile.followers.toLocaleString()} followers` : ''
      const fraudScore = parsedData.fraud_score ? ` • Fraud: ${Math.round(parsedData.fraud_score * 100)}%` : ''
      return `👤 ${platform.toUpperCase()}: @${profile.username || 'unknown'} (${profile.display_name || 'No name'})${followers}${fraudScore}`
    }

    // Transaction evidence
    if (parsedData?.original_content?.transaction_details) {
      const tx = parsedData.original_content.transaction_details
      const amount = tx.amount ? `₹${tx.amount.toLocaleString()}` : 'Unknown amount'
      const method = parsedData.original_content.platform || 'Payment'
      const fraudScore = parsedData.fraud_score ? ` • Fraud: ${Math.round(parsedData.fraud_score * 100)}%` : ''
      return `💳 ${method.toUpperCase()}: ${amount} transaction • ID: ${tx.transaction_id || 'Unknown'}${fraudScore}`
    }

    // Image analysis evidence
    if (parsedData?.original_content?.ocr_text) {
      const ocrText = parsedData.original_content.ocr_text.substring(0, 100)
      const platform = parsedData.original_content.platform || 'Unknown'
      const isForged = parsedData.ai_analysis?.verification_status === 'forged'
      const status = isForged ? '⚠️ FORGED' : '✅ Verified'
      const fraudScore = parsedData.fraud_score ? ` • Fraud: ${Math.round(parsedData.fraud_score * 100)}%` : ''
      return `🔍 ${platform.toUpperCase()}: ${status} • "${ocrText}${ocrText.length >= 100 ? '...' : ''}"${fraudScore}`
    }

    // Fallback with platform info
    if (parsedData?.original_content?.platform) {
      const platform = parsedData.original_content.platform
      const fraudScore = parsedData.fraud_score ? ` • Fraud Score: ${Math.round(parsedData.fraud_score * 100)}%` : ''
      return `📄 ${platform.toUpperCase()}: Evidence collected${fraudScore}`
    }

    // Last resort - show some key information if available
    if (parsedData?.fraud_score) {
      return `📊 Fraud Analysis: ${Math.round(parsedData.fraud_score * 100)}% confidence • ${parsedData.collection_trigger || 'Manual collection'}`
    }

    return '📄 Digital evidence collected and secured'
  }

  const getSeverityIndicator = (evidenceData: any) => {
    const parsedData = parseEvidenceData(evidenceData)
    const fraudScore = parsedData?.fraud_score || 0
    const confidenceLevel = parsedData?.confidence_level || fraudScore

    if (confidenceLevel >= 0.9 || fraudScore >= 0.9) {
      return { indicator: '🔴', level: 'Critical', color: 'text-red-600' }
    } else if (confidenceLevel >= 0.7 || fraudScore >= 0.7) {
      return { indicator: '🟡', level: 'High', color: 'text-yellow-600' }
    } else if (confidenceLevel >= 0.5 || fraudScore >= 0.5) {
      return { indicator: '🟠', level: 'Medium', color: 'text-orange-600' }
    } else if (confidenceLevel > 0 || fraudScore > 0) {
      return { indicator: '🟢', level: 'Low', color: 'text-green-600' }
    }
    return { indicator: '⚪', level: 'Unknown', color: 'text-gray-600' }
  }

  const formatDetailedEvidence = (evidenceData: any) => {
    const parsedData = parseEvidenceData(evidenceData)

    // Handle legacy string data that couldn't be parsed
    if (parsedData.raw_content) {
      return (
        <div className="space-y-3">
          <div className="bg-blue-50 p-3 rounded">
            <h5 className="font-medium text-blue-900 mb-2">Content</h5>
            <p className="text-sm text-blue-800">{parsedData.raw_content}</p>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {/* Original Content */}
        {parsedData?.original_content && (
          <div className="bg-blue-50 p-3 rounded">
            <h5 className="font-medium text-blue-900 mb-2">📄 Original Content</h5>
            <div className="space-y-2 text-sm">
              {parsedData.original_content.platform && (
                <p><strong>Platform:</strong> {parsedData.original_content.platform.toUpperCase()}</p>
              )}
              {parsedData.original_content.text && (
                <p><strong>Text:</strong> "{parsedData.original_content.text}"</p>
              )}
              {parsedData.original_content.ocr_text && (
                <p><strong>OCR Text:</strong> "{parsedData.original_content.ocr_text}"</p>
              )}
              {parsedData.original_content.channel && (
                <p><strong>Channel:</strong> {parsedData.original_content.channel}</p>
              )}
              {parsedData.original_content.profile_info && (
                <div>
                  <strong>Profile:</strong>
                  <div className="ml-4 mt-1">
                    <p>Username: @{parsedData.original_content.profile_info.username}</p>
                    <p>Display Name: {parsedData.original_content.profile_info.display_name}</p>
                    {parsedData.original_content.profile_info.followers && (
                      <p>Followers: {parsedData.original_content.profile_info.followers.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              )}
              {parsedData.original_content.transaction_details && (
                <div>
                  <strong>Transaction:</strong>
                  <div className="ml-4 mt-1">
                    <p>Amount: ₹{parsedData.original_content.transaction_details.amount?.toLocaleString()}</p>
                    <p>ID: {parsedData.original_content.transaction_details.transaction_id}</p>
                    <p>From: {parsedData.original_content.transaction_details.from_account}</p>
                    <p>To: {parsedData.original_content.transaction_details.to_account}</p>
                  </div>
                </div>
              )}
              {parsedData.original_content.conversation && (
                <div>
                  <strong>Conversation ({parsedData.original_content.conversation.length} messages):</strong>
                  <div className="ml-4 mt-1 max-h-32 overflow-y-auto">
                    {parsedData.original_content.conversation.slice(0, 3).map((msg: any, idx: number) => (
                      <p key={idx} className="text-xs bg-white p-1 rounded mb-1">
                        <strong>{msg.sender}:</strong> {msg.message}
                      </p>
                    ))}
                    {parsedData.original_content.conversation.length > 3 && (
                      <p className="text-xs text-gray-600 italic">... and {parsedData.original_content.conversation.length - 3} more messages</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Analysis */}
        {parsedData?.ai_analysis && (
          <div className="bg-purple-50 p-3 rounded">
            <h5 className="font-medium text-purple-900 mb-2">🤖 AI Analysis</h5>
            <div className="space-y-1 text-sm">
              {parsedData.ai_analysis.verification_status && (
                <p>
                  <strong>Verification:</strong>
                  <span className={parsedData.ai_analysis.verification_status === 'forged' ? 'text-red-600 font-bold' : 'text-green-600'}>
                    {parsedData.ai_analysis.verification_status.toUpperCase()}
                  </span>
                </p>
              )}
              {parsedData.ai_analysis.fake_document_confidence && (
                <p><strong>Fake Document Confidence:</strong> {Math.round(parsedData.ai_analysis.fake_document_confidence * 100)}%</p>
              )}
              {parsedData.ai_analysis.manipulation_detected !== undefined && (
                <p><strong>Manipulation Detected:</strong> {parsedData.ai_analysis.manipulation_detected ? 'Yes' : 'No'}</p>
              )}
            </div>
          </div>
        )}

        {/* Fraud Analysis */}
        {(parsedData?.fraud_score || parsedData?.flagged_keywords) && (
          <div className="bg-red-50 p-3 rounded">
            <h5 className="font-medium text-red-900 mb-2">⚠️ Fraud Analysis</h5>
            <div className="space-y-1 text-sm">
              {parsedData.fraud_score && (
                <p>
                  <strong>Fraud Score:</strong>
                  <span className={parsedData.fraud_score >= 0.9 ? 'text-red-600 font-bold' : parsedData.fraud_score >= 0.7 ? 'text-orange-600 font-semibold' : 'text-yellow-600'}>
                    {Math.round(parsedData.fraud_score * 100)}%
                  </span>
                </p>
              )}
              {parsedData.confidence_level && parsedData.confidence_level !== parsedData.fraud_score && (
                <p>
                  <strong>Confidence Level:</strong>
                  <span className={parsedData.confidence_level >= 0.9 ? 'text-red-600 font-bold' : parsedData.confidence_level >= 0.7 ? 'text-orange-600 font-semibold' : 'text-yellow-600'}>
                    {Math.round(parsedData.confidence_level * 100)}%
                  </span>
                </p>
              )}
              {parsedData.flagged_keywords && parsedData.flagged_keywords.length > 0 && (
                <div>
                  <strong>Flagged Keywords:</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {parsedData.flagged_keywords.map((keyword: string, idx: number) => (
                      <span key={idx} className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {parsedData.fraud_indicators && parsedData.fraud_indicators.length > 0 && (
                <div>
                  <strong>Fraud Indicators:</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {parsedData.fraud_indicators.map((indicator: string, idx: number) => (
                      <span key={idx} className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                        {indicator}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {parsedData.collection_trigger && (
                <p><strong>Collection Trigger:</strong> {parsedData.collection_trigger.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>
              )}
            </div>
          </div>
        )}

        {/* Technical Details */}
        <details className="bg-gray-50 p-3 rounded">
          <summary className="font-medium text-gray-900 cursor-pointer">🔧 Technical Details (Raw Data)</summary>
          <div className="mt-2 max-h-48 overflow-y-auto">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap">
              {JSON.stringify(parsedData, null, 2)}
            </pre>
          </div>
        </details>
      </div>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getTypeIcon(evidence.evidence_type)}</span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Evidence #{evidence.id}
            </h3>
            <p className="text-sm text-gray-600">
              Type: {evidence.evidence_type.replace('_', ' ')} • Alert #{evidence.alert_id}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(evidence.legal_status)}>
            {evidence.legal_status}
          </Badge>
          {evidence.alert_level && (
            <Badge className={getAlertLevelColor(evidence.alert_level)}>
              {evidence.alert_level} Priority
            </Badge>
          )}
          {evidence.court_admissible && (
            <Badge className="bg-green-100 text-green-800">
              Court Admissible
            </Badge>
          )}
        </div>
      </div>

      {/* Evidence Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">
            <strong>Case Number:</strong> {evidence.case_number || 'Not assigned'}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Collected By:</strong> {evidence.collected_by}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Collection Time:</strong> {formatTimestamp(evidence.collection_timestamp)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">
            <strong>Fraud Type:</strong> {evidence.fraud_type || 'Unknown'}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Chain Entries:</strong> {evidence.custody_entries}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Hash:</strong> {evidence.evidence_hash.substring(0, 12)}...
          </p>
        </div>
      </div>

      {/* Evidence Preview */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-600">
            <strong>Evidence Preview:</strong>
          </p>
          <div className="flex items-center space-x-2">
            {(() => {
              const severity = getSeverityIndicator(evidence.evidence_data)
              return (
                <span className={`text-xs font-medium ${severity.color} flex items-center space-x-1`}>
                  <span>{severity.indicator}</span>
                  <span>{severity.level} Risk</span>
                </span>
              )
            })()}
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded text-sm text-gray-700">
          {getEvidencePreview(evidence.evidence_data)}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <Button
            onClick={() => setShowDetails(!showDetails)}
            variant="outline"
            size="sm"
          >
            {showDetails ? 'Hide Details' : 'View Details'}
          </Button>
          <Button
            onClick={() => setShowCustodyForm(!showCustodyForm)}
            variant="outline"
            size="sm"
          >
            Add Custody Entry
          </Button>
          <Button
            onClick={() => onVerifyIntegrity(evidence.id)}
            variant="outline"
            size="sm"
          >
            Verify Integrity
          </Button>
        </div>
      </div>

      {/* Detailed Evidence Data */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-md font-semibold text-gray-900 mb-3">
            📋 Evidence Analysis & Details
          </h4>
          <div className="max-h-96 overflow-y-auto">
            {formatDetailedEvidence(evidence.evidence_data)}
          </div>
        </div>
      )}

      {/* Custody Entry Form */}
      {showCustodyForm && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-md font-semibold text-gray-900 mb-3">
            Add Chain of Custody Entry
          </h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action
              </label>
              <select
                value={custodyAction}
                onChange={(e) => setCustodyAction(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              >
                <option value="">Select action...</option>
                <option value="analyzed">Analyzed</option>
                <option value="reviewed">Reviewed</option>
                <option value="submitted">Submitted</option>
                <option value="exported">Exported</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <Textarea
                value={custodyNotes}
                onChange={(e) => setCustodyNotes(e.target.value)}
                placeholder="Add any relevant notes..."
                className="text-sm"
                rows={3}
              />
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={handleCustodySubmit}
                disabled={!custodyAction}
                size="sm"
              >
                Add Entry
              </Button>
              <Button
                onClick={() => {
                  setShowCustodyForm(false)
                  setCustodyAction('')
                  setCustodyNotes('')
                }}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}