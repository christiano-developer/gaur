'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import EvidenceList from '@/components/dashboard/EvidenceList'
import EvidenceStats from '@/components/dashboard/EvidenceStats'

export default function EvidencePage() {
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

    // Load evidence statistics
    loadEvidenceStats()
  }, [isAuthenticated, officer, router, loadUser])

  const loadEvidenceStats = async () => {
    try {
      const token = localStorage.getItem('gaur_access_token')
      const response = await fetch('http://localhost:8000/api/v1/evidence/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to load evidence stats:', error)
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
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
                <h1 className="text-xl font-bold text-gray-900">
                  Evidence Management
                </h1>
                <p className="text-sm text-gray-600">
                  Digital evidence collection and chain of custody
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {officer.name}
                </p>
                <p className="text-xs text-gray-600">
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
          <EvidenceStats stats={stats} />
        </div>
      )}

      {/* Main Evidence List */}
      <main className="mx-auto px-6 pb-8">
        <EvidenceList onStatsUpdate={setStats} />
      </main>
    </div>
  )
}