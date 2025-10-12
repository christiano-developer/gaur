'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import ThreatTimeline from '@/components/dashboard/ThreatTimeline'

export default function ThreatsPage() {
  const router = useRouter()
  const { officer, isAuthenticated, loadUser } = useAuthStore()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    // Load user data if not already loaded
    if (!officer) {
      loadUser()
    }

    // Load threat statistics
    loadThreatStats()
  }, [isAuthenticated, officer, router, loadUser])

  const loadThreatStats = async () => {
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
        if (result.success && result.data) {
          setStats(result.data)
        }
      }
    } catch (error) {
      console.error('Failed to load threat stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated || !officer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-forest-bg-primary">
      {/* Header */}
      <header className="bg-forest-bg-sidebar shadow-sm border-b border-forest-border">
        <div className="mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => router.push('/dashboard')}
                variant="outline"
                size="sm"
              >
                ← Back to Dashboard
              </Button>
              <div>
                <h1 className="text-xl font-bold text-forest-text-primary">
                  Threat Timeline
                </h1>
                <p className="text-sm text-forest-text-secondary">
                  Real-time fraud alerts and threat monitoring
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-forest-text-primary">
                  {officer.name}
                </p>
                <p className="text-xs text-forest-text-secondary">
                  {officer.rank} • {officer.badge_number}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Overview */}
      {!loading && stats && (
        <div className="mx-auto px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card className="p-4 forest-card-gradient border-forest-border">
              <h3 className="text-lg font-semibold text-forest-text-primary mb-2">
                Total Threats
              </h3>
              <p className="text-3xl font-bold text-forest-text-primary">
                {stats.total || 0}
              </p>
            </Card>

            <Card className="p-4 forest-card-gradient border-forest-border">
              <h3 className="text-lg font-semibold text-forest-text-primary mb-2">
                High Priority
              </h3>
              <p className="text-3xl font-bold text-forest-error">
                {stats.by_risk?.HIGH || 0}
              </p>
            </Card>

            <Card className="p-4 forest-card-gradient border-forest-border">
              <h3 className="text-lg font-semibold text-forest-text-primary mb-2">
                Open Threats
              </h3>
              <p className="text-3xl font-bold text-forest-warning">
                {stats.by_status?.open || 0}
              </p>
            </Card>

            <Card className="p-4 forest-card-gradient border-forest-border">
              <h3 className="text-lg font-semibold text-forest-text-primary mb-2">
                Medium Risk
              </h3>
              <p className="text-3xl font-bold text-forest-accent-light">
                {stats.by_risk?.MEDIUM || 0}
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* Main Threat Timeline */}
      <main className="mx-auto px-6 pb-8">
        <ThreatTimeline onStatsUpdate={setStats} />
      </main>
    </div>
  )
}