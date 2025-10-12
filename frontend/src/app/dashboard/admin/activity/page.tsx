'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  Search,
  Filter,
  Calendar,
  User,
  Shield,
  Clock,
  MapPin,
  RefreshCw,
  TrendingUp,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

interface ActivityLog {
  id: number
  officer_id: string
  action: string
  resource: string
  resource_id: string
  timestamp: string
  ip_address?: string
  user_agent?: string
  details?: Record<string, any>
  officer_name?: string
  officer_badge?: string
}

interface ActivityStats {
  total_activities: number
  unique_officers: number
  top_actions: Array<{ action: string; count: number }>
  recent_logins: number
  failed_attempts: number
}

export default function ActivityDashboard() {
  const { officer } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [stats, setStats] = useState<ActivityStats | null>(null)
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    officer_id: '',
    start_date: '',
    end_date: ''
  })

  // Check admin permission
  const hasAdminPermission = officer?.permissions?.some(
    (perm: any) =>
      (perm.resource === 'logs' && perm.action === 'read') ||
      perm.name?.includes('admin')
  )

  useEffect(() => {
    if (!hasAdminPermission) {
      setError('You do not have permission to access this page')
      setLoading(false)
      return
    }
    loadActivities()
    loadStats()
  }, [hasAdminPermission, page, filters])

  const loadActivities = async () => {
    try {
      setError(null)
      const token = localStorage.getItem('gaur_access_token')

      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        size: '20'
      })

      // Add filters if they exist
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value)
        }
      })

      const response = await fetch(`http://localhost:8000/api/v1/admin/activity-logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setActivities(data.items)
        setHasNext(data.has_next || false)
      } else {
        setError('Failed to load activity logs')
      }
    } catch (error) {
      console.error('Failed to load activities:', error)
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('gaur_access_token')

      // For now, calculate basic stats from the activities
      // In a real implementation, this would be a separate API endpoint
      const mockStats: ActivityStats = {
        total_activities: activities.length * 5, // Simulate total
        unique_officers: Math.floor(activities.length / 2),
        top_actions: [
          { action: 'login', count: 45 },
          { action: 'create_officer', count: 12 },
          { action: 'update_officer', count: 8 },
          { action: 'assign_role', count: 6 }
        ],
        recent_logins: 23,
        failed_attempts: 3
      }

      setStats(mockStats)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1) // Reset to first page when filters change
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const getActionColor = (action: string) => {
    const actionColors: Record<string, string> = {
      'login': 'bg-green-100 text-green-800',
      'logout': 'bg-gray-100 text-gray-800',
      'create_officer': 'bg-blue-100 text-blue-800',
      'update_officer': 'bg-yellow-100 text-yellow-800',
      'assign_role': 'bg-purple-100 text-purple-800',
      'remove_role': 'bg-red-100 text-red-800',
      'delete': 'bg-red-100 text-red-800',
      'view': 'bg-gray-100 text-gray-800'
    }
    return actionColors[action] || 'bg-gray-100 text-gray-800'
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login':
        return <CheckCircle className="h-3 w-3" />
      case 'logout':
        return <XCircle className="h-3 w-3" />
      case 'create_officer':
      case 'update_officer':
        return <User className="h-3 w-3" />
      case 'assign_role':
      case 'remove_role':
        return <Shield className="h-3 w-3" />
      default:
        return <Activity className="h-3 w-3" />
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const formatActivityDetails = (activity: ActivityLog) => {
    if (!activity.details) {
      return null
    }

    let details = activity.details

    // If details is a string, try to parse it as JSON
    if (typeof details === 'string') {
      try {
        details = JSON.parse(details)
      } catch (e) {
        // If parsing fails, display as string
        return (
          <div className="border-l-2 border-gray-300 pl-3">
            <span className="text-gray-600 text-sm">{details}</span>
          </div>
        )
      }
    }

    // If details is not an object, display as is
    if (typeof details !== 'object' || details === null) {
      return (
        <div className="border-l-2 border-gray-300 pl-3">
          <span className="text-gray-600 text-sm">{String(details)}</span>
        </div>
      )
    }

    // Filter out permission_ids if permission_names exists (to avoid redundancy)
    const filteredDetails = { ...details }
    if (filteredDetails.permission_names && filteredDetails.permission_ids) {
      delete filteredDetails.permission_ids
    }

    return (
      <div className="space-y-3">
        {Object.entries(filteredDetails).map(([key, value]) => (
          <div key={key} className="border-l-3 border-blue-200 pl-4 py-2 bg-blue-50/30 rounded-r">
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-gray-800 text-sm">
                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
              <div className="ml-2">
                {Array.isArray(value) ? (
                  <div className="space-y-2">
                    <span className="text-gray-500 text-xs font-medium">
                      {value.length} item{value.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {value.map((item, index) => {
                        // Special handling for permission names vs IDs
                        const isPermissionName = key === 'permission_names' || (typeof item === 'string' && item.includes('.'))
                        const badgeColor = isPermissionName ? 'bg-green-100 text-green-800 border-green-300' : 'bg-gray-100 text-gray-700 border-gray-300'

                        return (
                          <Badge
                            key={index}
                            variant="outline"
                            className={`text-xs px-2 py-1 ${badgeColor}`}
                          >
                            {String(item)}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                ) : typeof value === 'object' && value !== null ? (
                  <div className="space-y-1 ml-2">
                    {Object.entries(value).map(([subKey, subValue]) => (
                      <div key={subKey} className="flex items-center gap-2">
                        <span className="font-medium text-gray-600 text-sm">
                          {subKey.replace(/_/g, ' ')}:
                        </span>
                        <span className="text-gray-700 text-sm">
                          {String(subValue)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-700 text-sm font-medium">
                    {String(value)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!hasAdminPermission) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600">You do not have permission to access the activity dashboard.</p>
      </div>
    )
  }

  if (loading && activities.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Loading activity dashboard...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-7 w-7 text-blue-600" />
            Activity Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Monitor system activity and audit logs
          </p>
        </div>
        <Button
          onClick={loadActivities}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="text-red-600">{error}</p>
          <Button
            onClick={loadActivities}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Retry
          </Button>
        </Card>
      )}

      {/* Statistics Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-900">Total Activities</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total_activities}</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-900">Active Officers</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.unique_officers}</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-900">Recent Logins</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.recent_logins}</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-gray-900">Failed Attempts</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.failed_attempts}</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-gray-900">Top Action</span>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {stats.top_actions[0]?.action || 'N/A'}
            </p>
            <p className="text-xs text-gray-500">
              {stats.top_actions[0]?.count || 0} times
            </p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search activities..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="create_officer">Create Officer</option>
              <option value="update_officer">Update Officer</option>
              <option value="assign_role">Assign Role</option>
              <option value="remove_role">Remove Role</option>
              <option value="update_role_permissions">Update Role Permissions</option>
            </select>
          </div>

          <div>
            <Input
              type="text"
              placeholder="Officer ID..."
              value={filters.officer_id}
              onChange={(e) => handleFilterChange('officer_id', e.target.value)}
            />
          </div>

          <div>
            <Input
              type="date"
              placeholder="Start Date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
            />
          </div>

          <div>
            <Input
              type="date"
              placeholder="End Date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Activity Log */}
      <Card>
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activities</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {activities.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No activities found matching your criteria.</p>
            </div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={getActionColor(activity.action)}>
                        <div className="flex items-center gap-1">
                          {getActionIcon(activity.action)}
                          {activity.action.replace('_', ' ').toUpperCase()}
                        </div>
                      </Badge>
                      <span className="text-sm text-gray-600">
                        on {activity.resource}
                      </span>
                      {activity.resource_id && (
                        <span className="text-sm text-gray-500">
                          #{activity.resource_id}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {activity.officer_name || activity.officer_id}
                        {activity.officer_badge && (
                          <span className="text-gray-500">({activity.officer_badge})</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(activity.timestamp)}
                      </div>

                      {activity.ip_address && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {activity.ip_address}
                        </div>
                      )}
                    </div>

                    {activity.details && Object.keys(activity.details).length > 0 && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
                        <div className="text-xs font-medium text-gray-700 mb-2">Details:</div>
                        {formatActivityDetails(activity)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Pagination */}
      {activities.length > 0 && (
        <div className="flex justify-center items-center space-x-4 py-4">
          <Button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            variant="outline"
          >
            Previous
          </Button>

          <span className="text-sm text-gray-600">
            Page {page}
          </span>

          <Button
            onClick={() => handlePageChange(page + 1)}
            disabled={!hasNext}
            variant="outline"
          >
            Next
          </Button>
        </div>
      )}

      {/* Top Actions Summary */}
      {stats?.top_actions && stats.top_actions.length > 0 && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Most Common Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.top_actions.map((actionStat, index) => (
              <div key={actionStat.action} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  {getActionIcon(actionStat.action)}
                  <span className="font-medium text-gray-900">
                    {actionStat.action.replace('_', ' ')}
                  </span>
                </div>
                <Badge variant="outline">
                  {actionStat.count}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}