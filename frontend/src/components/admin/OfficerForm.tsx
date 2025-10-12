'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Eye, EyeOff, Shield, Plus, X } from 'lucide-react'

interface Officer {
  id?: number
  officer_id?: string
  badge_number: string
  name: string
  email?: string | null
  rank: string
  station?: string | null
  department?: string
  status?: 'active' | 'inactive' | 'suspended'
  active?: boolean
  roles?: any[]
  role_names?: string[]
  permission_count?: number
  last_login?: string | null
  created_at?: string
}

interface Role {
  id: number
  name: string
  level: number
  description: string
}

interface OfficerFormProps {
  officer?: Officer | null
  onSuccess: () => void
  onCancel: () => void
}

export default function OfficerForm({ officer, onSuccess, onCancel }: OfficerFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])

  const [formData, setFormData] = useState<{
    badge_number: string
    name: string
    email: string
    password: string
    rank: string
    station: string
    status: string
  }>({
    badge_number: '',
    name: '',
    email: '',
    password: '',
    rank: '',
    station: '',
    status: 'active'
  })

  useEffect(() => {
    loadAvailableRoles()

    if (officer) {
      setFormData({
        badge_number: officer.badge_number || '',
        name: officer.name || '',
        email: officer.email || `${officer.badge_number}@goapolice.gov.in`,
        password: '', // Don't populate password for editing
        rank: officer.rank || '',
        station: officer.station || officer.department || '',
        status: officer.status || (officer.active ? 'active' : 'inactive')
      })
      setSelectedRoles(officer.role_names || [])
    } else {
      // Reset form for new officer
      setFormData({
        badge_number: '',
        name: '',
        email: '',
        password: '',
        rank: '',
        station: '',
        status: 'active'
      })
      setSelectedRoles([])
    }
  }, [officer])

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
        setAvailableRoles(Array.isArray(roles) ? roles : [])
      }
    } catch (error) {
      console.error('Failed to load roles:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('gaur_access_token')
      const officerId = officer ? (officer.officer_id || officer.id) : null
      const url = officer
        ? `http://localhost:8000/api/v1/admin/officers/${officerId}`
        : 'http://localhost:8000/api/v1/admin/officers'

      const method = officer ? 'PUT' : 'POST'

      // Prepare the request body
      const requestBody: any = {
        badge_number: formData.badge_number,
        name: formData.name,
        rank: formData.rank,
        department: formData.station, // Backend expects 'department' field
        active: formData.status === 'active' // Backend expects boolean 'active' field
      }

      // Only include password for new officers or if password is provided for editing
      if (!officer || formData.password) {
        requestBody.password = formData.password
      }

      // Convert role names to role IDs for backend
      if (selectedRoles.length > 0) {
        const role_ids = selectedRoles.map(roleName => {
          const role = availableRoles.find(r => r.name === roleName)
          return role?.id
        }).filter(id => id !== undefined)
        requestBody.role_ids = role_ids
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        onSuccess()
      } else {
        const errorData = await response.json()
        // Handle different error formats (string, object, array)
        let errorMessage = 'Failed to save officer'
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map(err => typeof err === 'object' ? err.msg || JSON.stringify(err) : err).join(', ')
        } else if (typeof errorData.detail === 'object') {
          errorMessage = errorData.detail.msg || JSON.stringify(errorData.detail)
        } else if (errorData.message) {
          errorMessage = errorData.message
        }
        setError(errorMessage)
      }
    } catch (error) {
      console.error('Failed to save officer:', error)
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleRoleToggle = (roleName: string) => {
    setSelectedRoles(prev =>
      prev.includes(roleName)
        ? prev.filter(r => r !== roleName)
        : [...prev, roleName]
    )
  }

  const ranks = [
    'SuperAdmin',
    'DGP',
    'IGP',
    'SP',
    'Superintendent',
    'Inspector',
    'Sub-Inspector',
    'Senior Constable',
    'Constable'
  ]

  const stations = [
    'Panaji Police Station',
    'Margao Police Station',
    'Mapusa Police Station',
    'Vasco Police Station',
    'Ponda Police Station',
    'Curchorem Police Station',
    'Pernem Police Station',
    'Quepem Police Station',
    'Cyber Crime',
    'Cyber Crime Cell',
    'CID',
    'Traffic Police'
  ]

  // Only render form after data is loaded for editing
  if (officer && !formData.badge_number) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Display */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="text-red-600 text-sm">{typeof error === 'string' ? error : JSON.stringify(error)}</p>
        </Card>
      )}

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="badge_number">Badge Number *</Label>
            <Input
              id="badge_number"
              type="text"
              value={formData.badge_number}
              onChange={(e) => handleInputChange('badge_number', e.target.value)}
              required
              placeholder="e.g., GOA001"
            />
          </div>

          <div>
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
              placeholder="Officer's full name"
            />
          </div>

          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
              placeholder="officer@goapolice.gov.in"
            />
          </div>

          <div>
            <Label htmlFor="password">
              {officer ? 'Password (leave blank to keep current)' : 'Password *'}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                required={!officer}
                placeholder={officer ? 'Leave blank to keep current password' : 'Enter password'}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Position & Status */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Position & Status</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="rank">Rank *</Label>
            <Select
              value={formData.rank}
              onValueChange={(value) => handleInputChange('rank', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select rank" />
              </SelectTrigger>
              <SelectContent>
                {ranks.map((rank) => (
                  <SelectItem key={rank} value={rank}>
                    {rank}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="station">Station *</Label>
            <Select
              value={formData.station}
              onValueChange={(value) => handleInputChange('station', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select station" />
              </SelectTrigger>
              <SelectContent>
                {stations.map((station) => (
                  <SelectItem key={station} value={station}>
                    {station}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="status">Status *</Label>
            <Select value={formData.status} onValueChange={(value: any) => handleInputChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Role Assignment */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Role Assignment</h3>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Select the roles to assign to this officer. Roles determine access permissions.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableRoles.map((role) => (
              <Card
                key={role.id}
                className={`p-4 cursor-pointer transition-colors ${
                  selectedRoles.includes(role.name)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleRoleToggle(role.name)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{role.name}</h4>
                    <p className="text-xs text-gray-600 mt-1">{role.description}</p>
                    <Badge variant="outline" className="mt-2">
                      Level {role.level}
                    </Badge>
                  </div>
                  <div className="flex items-center">
                    {selectedRoles.includes(role.name) ? (
                      <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                        <Plus className="h-3 w-3 text-white rotate-45" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {selectedRoles.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-900 mb-2">Selected Roles:</p>
              <div className="flex flex-wrap gap-2">
                {selectedRoles.map((roleName) => (
                  <Badge
                    key={roleName}
                    className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                  >
                    {roleName}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-1 h-auto p-0 hover:bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRoleToggle(roleName)
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

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
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? 'Saving...' : officer ? 'Update Officer' : 'Create Officer'}
        </Button>
      </div>
    </form>
  )
}