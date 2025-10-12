'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  Users,
  Settings,
  Activity,
  BarChart3,
  UserPlus,
  Lock,
  Eye,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import Link from 'next/link'

interface AdminStats {
  total_officers: number
  active_officers: number
  inactive_officers: number
  recent_additions: number
  role_distribution: Record<string, number>
}

interface QuickAction {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  color: string
}

export default function AdminDashboard() {
  const { officer } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<AdminStats | null>(null)

  // Check admin permission
  const hasAdminPermission = officer?.permissions?.some(
    (perm: any) =>
      (perm.resource === 'users' && (perm.action === 'create' || perm.action === 'update')) ||
      (perm.resource === 'roles' && perm.action === 'manage') ||
      perm.name?.includes('admin')
  )

  useEffect(() => {
    if (!hasAdminPermission) {
      setError('You do not have permission to access this page')
      setLoading(false)
      return
    }
    loadStats()
  }, [hasAdminPermission])

  const loadStats = async () => {
    try {
      setError(null)
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
      } else {
        setError('Failed to load statistics')
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const quickActions: QuickAction[] = [
    {
      title: 'Manage Officers',
      description: 'Add, edit, and manage officer accounts',
      icon: <Users className="h-6 w-6" />,
      href: '/dashboard/admin/officers',
      color: 'bg-blue-500'
    },
    {
      title: 'Permission Matrix',
      description: 'Configure role-based permissions',
      icon: <Lock className="h-6 w-6" />,
      href: '/dashboard/admin/permissions',
      color: 'bg-green-500'
    },
    {
      title: 'Activity Monitoring',
      description: 'View system activity and audit logs',
      icon: <Activity className="h-6 w-6" />,
      href: '/dashboard/admin/activity',
      color: 'bg-purple-500'
    },
    {
      title: 'System Analytics',
      description: 'Performance metrics and insights',
      icon: <BarChart3 className="h-6 w-6" />,
      href: '/dashboard/admin/analytics',
      color: 'bg-orange-500'
    }
  ]

  if (!hasAdminPermission) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600">You do not have permission to access the admin dashboard.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Loading admin dashboard...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-7 w-7 text-blue-600" />
            Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            System administration and management
          </p>
        </div>
        <Badge className="bg-blue-100 text-blue-800">
          Administrator
        </Badge>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="text-red-600">{error}</p>
          <Button
            onClick={loadStats}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Retry
          </Button>
        </Card>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href}>
              <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer group">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${action.color} text-white group-hover:scale-110 transition-transform`}>
                    {action.icon}
                  </div>
                  <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    {action.title}
                  </h3>
                </div>
                <p className="text-sm text-gray-600">
                  {action.description}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* System Overview */}
      {stats && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-900">Total Officers</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.total_officers}</p>
              <p className="text-xs text-gray-500 mt-1">Registered in system</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-gray-900">Active Officers</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.active_officers}</p>
              <p className="text-xs text-gray-500 mt-1">Currently active</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-gray-900">Inactive Officers</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.inactive_officers}</p>
              <p className="text-xs text-gray-500 mt-1">Inactive accounts</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-900">Recent Additions</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.recent_additions}</p>
              <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
            </Card>
          </div>
        </div>
      )}

      {/* Role Distribution */}
      {stats?.role_distribution && Object.keys(stats.role_distribution).length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Role Distribution</h2>
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(stats.role_distribution).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{role}</p>
                    <p className="text-sm text-gray-600">{count} officers</p>
                  </div>
                  <Badge variant="outline" className="ml-2">
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Recent Activity Preview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <Link href="/dashboard/admin/activity">
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View All
            </Button>
          </Link>
        </div>
        <Card className="p-4">
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Activity monitoring coming soon</p>
            <p className="text-sm">Click "View All" to access detailed activity logs</p>
          </div>
        </Card>
      </div>

      {/* Admin Tools */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Administration Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Settings className="h-5 w-5 text-gray-600" />
              <h3 className="font-medium text-gray-900">System Configuration</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Configure system settings, security policies, and operational parameters.
            </p>
            <Button variant="outline" size="sm" disabled>
              Coming Soon
            </Button>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <UserPlus className="h-5 w-5 text-gray-600" />
              <h3 className="font-medium text-gray-900">Bulk Operations</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Import/export officers, batch role assignments, and bulk updates.
            </p>
            <Button variant="outline" size="sm" disabled>
              Coming Soon
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}