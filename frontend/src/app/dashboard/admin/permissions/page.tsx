'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Shield,
  Search,
  Save,
  RefreshCw,
  Settings,
  Lock,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

interface Permission {
  id: number
  name: string
  resource: string
  action: string
  description: string
}

interface Role {
  id: number
  name: string
  display_name: string
  description: string
  level: number
  permissions: string[]
}

interface PermissionMatrix {
  [roleId: number]: {
    [permissionId: number]: boolean
  }
}

export default function PermissionsPage() {
  const { officer } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [matrix, setMatrix] = useState<PermissionMatrix>({})
  const [originalMatrix, setOriginalMatrix] = useState<PermissionMatrix>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedResource, setSelectedResource] = useState<string>('all')

  // Check admin permission
  const hasAdminPermission = officer?.permissions?.some(
    (perm: any) =>
      (perm.resource === 'roles' && perm.action === 'manage') ||
      perm.name?.includes('admin')
  )

  useEffect(() => {
    if (!hasAdminPermission) {
      setError('You do not have permission to access this page')
      setLoading(false)
      return
    }
    loadData()
  }, [hasAdminPermission])

  const loadData = async () => {
    try {
      setError(null)
      const token = localStorage.getItem('gaur_access_token')

      // Load roles and permissions in parallel
      const [rolesResponse, permissionsResponse] = await Promise.all([
        fetch('http://localhost:8000/api/v1/admin/roles', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch('http://localhost:8000/api/v1/admin/permissions', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      ])

      if (rolesResponse.ok && permissionsResponse.ok) {
        const rolesData = await rolesResponse.json()
        const permissionsData = await permissionsResponse.json()

        setRoles(rolesData)
        setPermissions(permissionsData)

        // Build permission matrix
        const newMatrix: PermissionMatrix = {}
        rolesData.forEach((role: Role) => {
          newMatrix[role.id] = {}
          permissionsData.forEach((permission: Permission) => {
            newMatrix[role.id][permission.id] = (role.permissions || []).includes(permission.name)
          })
        })

        setMatrix(newMatrix)
        setOriginalMatrix(JSON.parse(JSON.stringify(newMatrix)))
      } else {
        setError('Failed to load data')
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const togglePermission = (roleId: number, permissionId: number) => {
    setMatrix(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [permissionId]: !prev[roleId]?.[permissionId]
      }
    }))
  }

  const saveChanges = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const token = localStorage.getItem('gaur_access_token')
      const changedRoles: number[] = []

      // Find roles with changes
      for (const roleId in matrix) {
        const roleIdNum = parseInt(roleId)
        for (const permissionId in matrix[roleIdNum]) {
          const permIdNum = parseInt(permissionId)
          if (matrix[roleIdNum][permIdNum] !== originalMatrix[roleIdNum]?.[permIdNum]) {
            if (!changedRoles.includes(roleIdNum)) {
              changedRoles.push(roleIdNum)
            }
          }
        }
      }

      // Update each changed role
      for (const roleId of changedRoles) {
        const permissionIds = permissions
          .filter(perm => matrix[roleId]?.[perm.id])
          .map(perm => perm.id)

        const response = await fetch(`http://localhost:8000/api/v1/admin/roles/${roleId}/permissions`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            permission_ids: permissionIds
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || 'Failed to update permissions')
        }
      }

      setOriginalMatrix(JSON.parse(JSON.stringify(matrix)))
      setSuccess(`Successfully updated permissions for ${changedRoles.length} role(s)`)

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)

    } catch (error: any) {
      console.error('Failed to save changes:', error)
      setError(error.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = () => {
    return JSON.stringify(matrix) !== JSON.stringify(originalMatrix)
  }

  const resetChanges = () => {
    setMatrix(JSON.parse(JSON.stringify(originalMatrix)))
  }

  // Filter permissions by resource and search term
  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permission.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesResource = selectedResource === 'all' || permission.resource === selectedResource
    return matchesSearch && matchesResource
  })

  // Get unique resources for filtering
  const resources = ['all', ...Array.from(new Set(permissions.map(p => p.resource)))]

  if (!hasAdminPermission) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600">You do not have permission to access the permissions management interface.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Loading permissions matrix...</p>
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
            Permission Matrix
          </h1>
          <p className="text-gray-600 mt-1">
            Manage role permissions across the system
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={loadData}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {hasChanges() && (
            <>
              <Button
                onClick={resetChanges}
                variant="outline"
                size="sm"
              >
                Reset
              </Button>
              <Button
                onClick={saveChanges}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-600">{error}</p>
          </div>
        </Card>
      )}

      {success && (
        <Card className="p-4 border-green-200 bg-green-50">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-600">{success}</p>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search permissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <select
              value={selectedResource}
              onChange={(e) => setSelectedResource(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {resources.map(resource => (
                <option key={resource} value={resource}>
                  {resource === 'all' ? 'All Resources' : resource.charAt(0).toUpperCase() + resource.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Permission Matrix */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 border-r">
                  Role / Permission
                </th>
                {filteredPermissions.map((permission) => (
                  <th
                    key={permission.id}
                    className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-24"
                    title={permission.description}
                  >
                    <div className="transform -rotate-45 origin-center whitespace-nowrap">
                      {permission.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white border-r">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {role.display_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        Level {role.level}
                      </div>
                    </div>
                  </td>
                  {filteredPermissions.map((permission) => (
                    <td key={permission.id} className="px-3 py-4 text-center">
                      <button
                        onClick={() => togglePermission(role.id, permission.id)}
                        className={`w-6 h-6 rounded-full border-2 transition-colors ${
                          matrix[role.id]?.[permission.id]
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        title={`${matrix[role.id]?.[permission.id] ? 'Remove' : 'Add'} ${permission.name} for ${role.display_name}`}
                      >
                        {matrix[role.id]?.[permission.id] && (
                          <CheckCircle className="w-4 h-4 mx-auto" />
                        )}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-900">Total Roles</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{roles.length}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-gray-900">Total Permissions</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{permissions.length}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-900">Changes Made</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {hasChanges() ? '✓ Pending' : '0'}
          </p>
        </Card>
      </div>
    </div>
  )
}