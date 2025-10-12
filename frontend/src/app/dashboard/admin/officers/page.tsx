'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Users, Shield, AlertTriangle, UserCheck } from 'lucide-react'
import OfficerList from '@/components/admin/OfficerList'

interface OfficerStats {
  total_officers: number
  active_officers: number
  inactive_officers: number
  role_distribution: Record<string, number>
  recent_additions: number
}

export default function OfficersAdminPage() {
  const router = useRouter()
  const { officer, isAuthenticated, loadUser } = useAuthStore()
  const [stats, setStats] = useState<OfficerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    // Load user data if not already loaded
    if (!officer) {
      loadUser()
    }

    // Load officer statistics
    loadOfficerStats()
  }, [isAuthenticated, officer, router, loadUser])

  const loadOfficerStats = async () => {
    try {
      const token = localStorage.getItem('gaur_access_token')
      const response = await fetch('http://localhost:8000/api/v1/admin/officers/stats', {
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
      console.error('Failed to load officer stats:', error)
    } finally {
      setLoading(false)
    }
  }

  // Check if user has admin permissions
  const hasAdminPermission = officer?.permissions?.some(
    (perm: any) =>
      (perm.resource === 'users' && (perm.action === 'create' || perm.action === 'update')) ||
      perm.name?.includes('admin')
  )

  if (!isAuthenticated || !officer) {
    return (
      <div className="min-h-screen bg-forest-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forest-accent-primary mx-auto mb-4"></div>
          <p className="text-forest-text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  if (!hasAdminPermission) {
    return (
      <div className="min-h-screen bg-forest-bg-primary flex items-center justify-center">
        <Card className="p-8 text-center max-w-md mx-auto forest-card-gradient border-forest-border">
          <AlertTriangle className="h-12 w-12 text-forest-warning mx-auto mb-4" />
          <h2 className="text-xl font-bold text-forest-text-primary mb-2">Access Restricted</h2>
          <p className="text-forest-text-secondary mb-4">
            You don't have permission to access officer administration.
          </p>
          <Button onClick={() => router.push('/dashboard')} variant="outline">
            Back to Dashboard
          </Button>
        </Card>
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
                <h1 className="text-xl font-bold text-forest-text-primary flex items-center gap-2">
                  <Users className="h-5 w-5 text-forest-accent-primary" />
                  Officer Management
                </h1>
                <p className="text-sm text-forest-text-secondary">
                  Manage officers, roles, and permissions
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setShowAddForm(true)}
                className="bg-forest-button-primary hover:bg-forest-accent-hover text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Officer
              </Button>
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
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-forest-text-secondary mb-1">
                    Total Officers
                  </h3>
                  <p className="text-2xl font-bold text-forest-text-primary">
                    {stats.total_officers || 0}
                  </p>
                </div>
                <Users className="h-8 w-8 text-forest-accent-primary" />
              </div>
            </Card>

            <Card className="p-4 forest-card-gradient border-forest-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-forest-text-secondary mb-1">
                    Active Officers
                  </h3>
                  <p className="text-2xl font-bold text-forest-trend-up">
                    {stats.active_officers || 0}
                  </p>
                </div>
                <UserCheck className="h-8 w-8 text-forest-trend-up" />
              </div>
            </Card>

            <Card className="p-4 forest-card-gradient border-forest-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-forest-text-secondary mb-1">
                    Roles Assigned
                  </h3>
                  <p className="text-2xl font-bold text-forest-accent-light">
                    {stats.role_distribution ? Object.keys(stats.role_distribution).length : 0}
                  </p>
                </div>
                <Shield className="h-8 w-8 text-forest-accent-light" />
              </div>
            </Card>

            <Card className="p-4 forest-card-gradient border-forest-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-forest-text-secondary mb-1">
                    Recent Additions
                  </h3>
                  <p className="text-2xl font-bold text-forest-warning">
                    {stats.recent_additions || 0}
                  </p>
                </div>
                <Plus className="h-8 w-8 text-forest-warning" />
              </div>
            </Card>
          </div>

          {/* Role Distribution */}
          {stats.role_distribution && Object.keys(stats.role_distribution).length > 0 && (
            <Card className="p-6 mb-6 forest-card-gradient border-forest-border">
              <h3 className="text-lg font-semibold text-forest-text-primary mb-4">
                Role Distribution
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(stats.role_distribution).map(([role, count]) => (
                  <div key={role} className="text-center">
                    <p className="text-2xl font-bold text-forest-text-primary">{count}</p>
                    <p className="text-sm text-forest-text-secondary capitalize">{role.replace('_', ' ')}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Main Officer List */}
      <main className="mx-auto px-6 pb-8">
        <OfficerList
          onStatsUpdate={setStats}
          showAddForm={showAddForm}
          onCloseAddForm={() => setShowAddForm(false)}
        />
      </main>
    </div>
  )
}