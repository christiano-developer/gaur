'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, Plus, X, Users, Lock, CheckCircle } from 'lucide-react'

interface Officer {
  officer_id?: string
  id?: number
  badge_number: string
  name: string
  email?: string | null
  rank: string
  station?: string | null
  department?: string
  active?: boolean
  status?: 'active' | 'inactive' | 'suspended'
  roles?: any[]
  role_names?: string[]
  permissions?: any[]
  last_login?: string | null
  created_at?: string
}

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
  level: number
  description: string
  permissions: Permission[]
}

interface RoleAssignmentProps {
  officer: Officer
  onSuccess: () => void
  onCancel: () => void
}

export default function RoleAssignment({ officer, onSuccess, onCancel }: RoleAssignmentProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])
  const [selectedRoles, setSelectedRoles] = useState<string[]>(officer.role_names || [])
  const [originalRoles] = useState<string[]>(officer.role_names || [])

  useEffect(() => {
    loadAvailableRoles()
  }, [])

  const loadAvailableRoles = async () => {
    try {
      const token = localStorage.getItem('gaur_access_token')
      const response = await fetch('http://localhost:8000/api/v1/admin/roles', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const result = await response.json()
        const roles = result.data || result
        console.log('Loaded roles:', roles) // Debug log
        setAvailableRoles(roles)
      } else {
        console.error('Failed to fetch roles:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to load roles:', error)
      setError('Failed to load available roles')
    }
  }

  const handleSaveRoles = async () => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('gaur_access_token')

      // Convert role names to role IDs
      const role_ids = selectedRoles.map(roleName => {
        const role = availableRoles.find(r => r.name === roleName)
        return role?.id
      }).filter(id => id !== undefined)

      const officerId = officer.officer_id || officer.id
      const response = await fetch(`http://localhost:8000/api/v1/admin/officers/${officerId}/roles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role_ids: role_ids
        }),
      })

      if (response.ok) {
        onSuccess()
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Failed to update roles')
      }
    } catch (error) {
      console.error('Failed to update roles:', error)
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleToggle = (roleName: string) => {
    setSelectedRoles(prev =>
      prev.includes(roleName)
        ? prev.filter(r => r !== roleName)
        : [...prev, roleName]
    )
  }

  const hasChanges = () => {
    return JSON.stringify(selectedRoles.sort()) !== JSON.stringify(originalRoles.sort())
  }

  const getRoleLevel = (roleName: string) => {
    const role = availableRoles.find(r => r.name === roleName)
    return role ? role.level : 0
  }

  const getTotalPermissions = () => {
    const allPermissions = new Set<number>()
    selectedRoles.forEach(roleName => {
      const role = availableRoles.find(r => r.name === roleName)
      if (role && role.permissions) {
        (role.permissions || []).forEach(perm => allPermissions.add(perm.id))
      }
    })
    return allPermissions.size
  }

  const getHighestRoleLevel = () => {
    return Math.max(...selectedRoles.map(getRoleLevel), 0)
  }

  return (
    <div className="space-y-6">
      {/* Officer Information */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{officer.name || 'Unknown Officer'}</h3>
          <p className="text-sm text-gray-600">
            {officer.rank || 'Unknown Rank'} • Badge: {officer.badge_number || 'N/A'} • Department: {officer.station || officer.department || 'Unknown Department'}
          </p>
        </div>
        <Badge className={officer.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
          {officer.active ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="text-red-600 text-sm">{error}</p>
        </Card>
      )}

      {/* Current vs New Role Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-900">Selected Roles</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{selectedRoles.length}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-gray-900">Total Permissions</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{getTotalPermissions()}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-900">Highest Level</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{getHighestRoleLevel()}</p>
        </Card>
      </div>

      {/* Role Selection */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Available Roles</h3>
        </div>

        {availableRoles.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading available roles...</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          {availableRoles.map((role) => {
            const isSelected = selectedRoles.includes(role.name)
            const wasOriginal = originalRoles.includes(role.name)
            const isChanged = isSelected !== wasOriginal

            return (
              <Card
                key={role.id}
                className={`p-4 cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${isChanged ? 'ring-2 ring-orange-200' : ''}`}
                onClick={() => handleRoleToggle(role.name)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">{role.name}</h4>
                      {isChanged && (
                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                          {isSelected ? 'Adding' : 'Removing'}
                        </Badge>
                      )}
                      {wasOriginal && !isChanged && (
                        <Badge variant="outline" className="text-xs text-gray-600">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{role.description}</p>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        Level {role.level}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {(role.permissions || []).length} permissions
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center">
                    {isSelected ? (
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
                    )}
                  </div>
                </div>

                {/* Role Permissions Preview */}
                {isSelected && (role.permissions || []).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-700 mb-2">Permissions included:</p>
                    <div className="flex flex-wrap gap-1">
                      {(role.permissions || []).slice(0, 6).map((permission) => (
                        <Badge key={permission.id} variant="outline" className="text-xs">
                          {permission.name}
                        </Badge>
                      ))}
                      {(role.permissions || []).length > 6 && (
                        <Badge variant="outline" className="text-xs">
                          +{(role.permissions || []).length - 6} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </div>

      {/* Selected Roles Summary */}
      {selectedRoles.length > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <h4 className="font-medium text-blue-900 mb-3">Selected Roles Summary</h4>
          <div className="flex flex-wrap gap-2">
            {selectedRoles.map((roleName) => {
              const role = availableRoles.find(r => r.name === roleName)
              const wasOriginal = originalRoles.includes(roleName)

              return (
                <Badge
                  key={roleName}
                  className={`${
                    wasOriginal ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  } hover:opacity-80`}
                >
                  {roleName}
                  {!wasOriginal && <span className="ml-1 text-xs">(NEW)</span>}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-auto p-0 hover:bg-transparent"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRoleToggle(roleName)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )
            })}
          </div>
        </Card>
      )}

      {/* Changes Summary */}
      {hasChanges() && (
        <Card className="p-4 bg-orange-50 border-orange-200">
          <h4 className="font-medium text-orange-900 mb-2">Pending Changes</h4>
          <div className="space-y-2">
            {selectedRoles.filter(role => !originalRoles.includes(role)).map(role => (
              <div key={role} className="flex items-center gap-2 text-sm text-green-700">
                <Plus className="h-4 w-4" />
                <span>Adding role: {role}</span>
              </div>
            ))}
            {originalRoles.filter(role => !selectedRoles.includes(role)).map(role => (
              <div key={role} className="flex items-center gap-2 text-sm text-red-700">
                <X className="h-4 w-4" />
                <span>Removing role: {role}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-4 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSaveRoles}
          disabled={loading || !hasChanges()}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? 'Saving...' : 'Update Roles'}
        </Button>
      </div>
    </div>
  )
}