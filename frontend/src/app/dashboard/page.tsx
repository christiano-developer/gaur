'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  const router = useRouter()
  const { officer, isAuthenticated, logout, loadUser } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    // Load user data if not already loaded
    if (!officer) {
      loadUser()
    }
  }, [isAuthenticated, officer, router, loadUser])

  const handleLogout = async () => {
    await logout()
    router.push('/login')
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
              <div className="w-10 h-10 bg-forest-accent-primary rounded-full flex items-center justify-center">
                <span className="text-white font-bold">GP</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-forest-text-primary">
                  GAUR Police Dashboard
                </h1>
                <p className="text-sm text-forest-text-secondary">
                  Goa Anti-fraud Unified Radar
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
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Welcome Card */}
          <Card className="p-6 col-span-full forest-card-gradient border-forest-border">
            <h2 className="text-2xl font-bold text-forest-text-primary mb-2">
              Welcome back, {officer.name.split(' ')[0]}!
            </h2>
            <p className="text-forest-text-secondary mb-4">
              You are logged in as <strong className="text-forest-text-primary">{officer.rank}</strong> with {officer.roles.length} role(s).
            </p>
            <div className="flex flex-wrap gap-2">
              {officer.roles.map((role) => (
                <span
                  key={role.id}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-forest-accent-primary/20 text-forest-accent-light"
                >
                  {role.display_name}
                </span>
              ))}
            </div>
          </Card>

          {/* System Status */}
          <Card className="p-6 forest-card-gradient border-forest-border">
            <h3 className="text-lg font-semibold text-forest-text-primary mb-2">
              System Status
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-forest-text-secondary">Backend API</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-forest-trend-up/20 text-forest-trend-up">
                  Connected
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-forest-text-secondary">Database</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-forest-trend-up/20 text-forest-trend-up">
                  Online
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-forest-text-secondary">Authentication</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-forest-trend-up/20 text-forest-trend-up">
                  Active
                </span>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-6 bg-forest-bg-quick-actions border-forest-border">
            <h3 className="text-lg font-semibold text-forest-bg-primary mb-4">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Button
                className="w-full justify-start"
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard/threats')}
              >
                📊 View Threat Timeline
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard/evidence')}
              >
                🔒 Evidence Management
              </Button>

              {/* Admin Section - Only show for officers with admin permissions */}
              {officer.permissions?.some((perm: any) =>
                (perm.resource === 'users' && (perm.action === 'create' || perm.action === 'update')) ||
                perm.name?.includes('admin')
              ) && (
                <Button
                  className="w-full justify-start bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/dashboard/admin/officers')}
                >
                  👥 Officer Management
                </Button>
              )}

              {/* AI Patrol Hub - Show for officers with AI permissions */}
              {officer.permissions?.some((perm: any) =>
                perm.name?.includes('ai_') || perm.name?.includes('system')
              ) && (
                <Button
                  className="w-full justify-start bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/dashboard/ai-patrol')}
                >
                  🤖 AI Patrol Hub
                </Button>
              )}

              <Button
                className="w-full justify-start"
                variant="outline"
                size="sm"
              >
                👁️ Monitor Social Media
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                size="sm"
              >
                📈 Generate Reports
              </Button>
            </div>
          </Card>

          {/* Permissions */}
          <Card className="p-6 forest-card-gradient border-forest-border">
            <h3 className="text-lg font-semibold text-forest-text-primary mb-2">
              Your Permissions
            </h3>
            <div className="text-sm text-forest-text-secondary">
              <p className="mb-2">
                <strong className="text-forest-text-primary">Department:</strong> {officer.department}
              </p>
              <p className="mb-2">
                <strong className="text-forest-text-primary">Minimum Role Level:</strong> {officer.minimum_role_level}
              </p>
              <p>
                <strong className="text-forest-text-primary">Permissions:</strong> {officer.permissions.length} granted
              </p>
            </div>
          </Card>
        </div>

        {/* API Documentation Link */}
        <Card className="p-6 forest-card-gradient border-forest-border">
          <h3 className="text-lg font-semibold text-forest-text-primary mb-2">
            Development Tools
          </h3>
          <p className="text-forest-text-secondary mb-4">
            Access backend API documentation and system health monitoring.
          </p>
          <div className="flex space-x-4">
            <Button
              onClick={() => window.open('http://localhost:8000/docs', '_blank')}
              variant="outline"
            >
              API Documentation
            </Button>
            <Button
              onClick={() => window.open('http://localhost:8000/health', '_blank')}
              variant="outline"
            >
              System Health
            </Button>
          </div>
        </Card>
      </main>
    </div>
  )
}