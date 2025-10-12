export interface ApiResponse<T = any> {
  data?: T
  message?: string
  error?: string
  errors?: Record<string, string[]>
  success: boolean
  timestamp: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
  has_next: boolean
  has_prev: boolean
}
