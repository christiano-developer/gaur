export interface Permission {
  name: string
  resource: string
  action: string
  description?: string
}

export interface Role {
  id: number
  name: string
  display_name: string
  description?: string
  level: number
}

export interface Officer {
  officer_id: string
  badge_number: string
  name: string
  rank: string
  department: string
  active: boolean
  created_at?: string
  last_login?: string
  two_factor_enabled: boolean
  roles: Role[]
  permissions: Permission[]
  role_names: string[]
  minimum_role_level: number
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  officer: Officer
}

export interface LoginRequest {
  badge_number: string
  password: string
  two_factor_code?: string
}
