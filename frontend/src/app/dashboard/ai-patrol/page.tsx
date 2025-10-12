'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  Play,
  Square,
  Activity,
  Shield,
  Globe,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Brain,
  Zap,
  TrendingUp,
  Settings
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/store/auth-store'

// Types
interface ServiceStatus {
  name: string
  status: 'stopped' | 'starting' | 'running' | 'stopping' | 'error'
  last_started?: string
  last_stopped?: string
  error_message?: string
  pid?: number
  uptime_seconds?: number
  stats: Record<string, any>
}

interface PatrolStats {
  system_status: {
    services_running: number
    total_services: number
    system_uptime: number
    active_sessions: number
  }
  active_sessions: Record<string, any>
  service_statistics: Record<string, any>
  last_updated: string
}

interface LiveThreat {
  id: number
  source_platform: string
  content_text: string
  risk_level: 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMAL'
  fraud_type: string
  confidence_score: number
  created_at: string
  detected_keywords: string[]
}

const AIPatrolPage = () => {
  const { token } = useAuth()
  const [servicesStatus, setServicesStatus] = useState<Record<string, ServiceStatus>>({})
  const [patrolStats, setPatrolStats] = useState<PatrolStats | null>(null)
  const [liveThreats, setLiveThreats] = useState<LiveThreat[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // Service management state
  const [startingServices, setStartingServices] = useState<Set<string>>(new Set())
  const [stoppingServices, setStoppingServices] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (token) {
      loadPatrolData()
      // Set up polling for real-time updates
      const interval = setInterval(loadPatrolData, 5000)
      return () => clearInterval(interval)
    }
  }, [token])

  const loadPatrolData = async () => {
    try {
      const [statusRes, statsRes, threatsRes] = await Promise.all([
        apiClient.get('/api/v1/ai/patrol/services/status'),
        apiClient.get('/api/v1/ai/patrol/stats'),
        apiClient.get('/api/v1/ai/threats/live?limit=10')
      ])

      if (statusRes.success) {
        setServicesStatus(statusRes.services || {})
      }
      if (statsRes.success) {
        setPatrolStats(statsRes)
      }
      setLiveThreats(threatsRes || [])
      setLoading(false)
    } catch (error) {
      console.error('Failed to load patrol data:', error)
      setLoading(false)
    }
  }

  const handleStartService = async (serviceName: string) => {
    setStartingServices(prev => new Set(prev).add(serviceName))
    try {
      const response = await apiClient.post(`/api/v1/ai/patrol/services/${serviceName}/start`)
      if (response.success) {
        await loadPatrolData()
      }
    } catch (error) {
      console.error(`Failed to start ${serviceName}:`, error)
    } finally {
      setStartingServices(prev => {
        const newSet = new Set(prev)
        newSet.delete(serviceName)
        return newSet
      })
    }
  }

  const handleStopService = async (serviceName: string) => {
    setStoppingServices(prev => new Set(prev).add(serviceName))
    try {
      const response = await apiClient.post(`/api/v1/ai/patrol/services/${serviceName}/stop`)
      if (response.success) {
        await loadPatrolData()
      }
    } catch (error) {
      console.error(`Failed to stop ${serviceName}:`, error)
    } finally {
      setStoppingServices(prev => {
        const newSet = new Set(prev)
        newSet.delete(serviceName)
        return newSet
      })
    }
  }

  const handleStartPatrolSession = async () => {
    try {
      const response = await apiClient.post('/api/v1/ai/patrol/session/start', {
        services: ['facebook_scraper', 'telegram_scraper', 'ai_analyzer'],
        config: {
          scrape_interval: 3600,
          enable_real_time: true
        }
      })
      if (response.success) {
        await loadPatrolData()
      }
    } catch (error) {
      console.error('Failed to start patrol session:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'starting':
      case 'stopping':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <XCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      running: 'default',
      starting: 'secondary',
      stopping: 'secondary',
      error: 'destructive',
      stopped: 'outline'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.toUpperCase()}
      </Badge>
    )
  }

  const getRiskBadge = (riskLevel: string) => {
    const variants = {
      HIGH: 'destructive',
      MEDIUM: 'secondary',
      LOW: 'outline',
      MINIMAL: 'outline'
    } as const

    return (
      <Badge variant={variants[riskLevel as keyof typeof variants] || 'outline'}>
        {riskLevel}
      </Badge>
    )
  }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">AI Patrol Hub</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-blue-600" />
            AI Patrol Hub
          </h1>
          <p className="text-muted-foreground">
            Central command for AI-powered fraud detection and social media monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleStartPatrolSession} className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Start Full Patrol
          </Button>
        </div>
      </div>

      {/* System Status Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Services</p>
                <p className="text-2xl font-bold">
                  {patrolStats?.system_status.services_running || 0} / {patrolStats?.system_status.total_services || 0}
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
            <Progress
              value={(patrolStats?.system_status.services_running || 0) / (patrolStats?.system_status.total_services || 1) * 100}
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Live Threats</p>
                <p className="text-2xl font-bold">{liveThreats.length}</p>
              </div>
              <Shield className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {liveThreats.filter(t => t.risk_level === 'HIGH').length} high risk
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Patrol Sessions</p>
                <p className="text-2xl font-bold">{patrolStats?.system_status.active_sessions || 0}</p>
              </div>
              <Zap className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Active</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">System Health</p>
                <p className="text-2xl font-bold text-green-600">Healthy</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">All systems operational</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="threats">Live Threats</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Service Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Service Status
                </CardTitle>
                <CardDescription>Current status of AI patrol services</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(servicesStatus).map(([name, status]) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(status.status)}
                      <span className="font-medium">{name.replace('_', ' ').toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(status.status)}
                      {status.uptime_seconds && (
                        <span className="text-sm text-muted-foreground">
                          {formatUptime(status.uptime_seconds)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Threats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Recent Threats
                </CardTitle>
                <CardDescription>Latest AI-detected fraud alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {liveThreats.slice(0, 5).map((threat) => (
                  <div key={threat.id} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getRiskBadge(threat.risk_level)}
                        <span className="text-sm text-muted-foreground">{threat.source_platform}</span>
                      </div>
                      <p className="text-sm">{threat.content_text.substring(0, 100)}...</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {threat.fraud_type} • {(threat.confidence_score * 100).toFixed(1)}% confidence
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(servicesStatus).map(([name, status]) => (
              <Card key={name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{name.replace('_', ' ').toUpperCase()}</CardTitle>
                    {getStatusIcon(status.status)}
                  </div>
                  <CardDescription>
                    {name === 'facebook_scraper' && 'Monitors Facebook groups for fraud content'}
                    {name === 'telegram_scraper' && 'Monitors Telegram channels for suspicious messages'}
                    {name === 'ai_analyzer' && 'AI-powered content analysis and fraud detection'}
                    {name === 'domain_monitor' && 'Domain and IP reputation monitoring'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status:</span>
                    {getStatusBadge(status.status)}
                  </div>

                  {status.uptime_seconds && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Uptime:</span>
                      <span className="text-sm">{formatUptime(status.uptime_seconds)}</span>
                    </div>
                  )}

                  {status.error_message && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{status.error_message}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    {status.status === 'running' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStopService(name)}
                        disabled={stoppingServices.has(name)}
                        className="flex items-center gap-1"
                      >
                        <Square className="h-3 w-3" />
                        {stoppingServices.has(name) ? 'Stopping...' : 'Stop'}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleStartService(name)}
                        disabled={startingServices.has(name)}
                        className="flex items-center gap-1"
                      >
                        <Play className="h-3 w-3" />
                        {startingServices.has(name) ? 'Starting...' : 'Start'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="threats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Live Threat Feed</CardTitle>
              <CardDescription>Real-time fraud detection alerts from social media monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {liveThreats.map((threat) => (
                  <div key={threat.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getRiskBadge(threat.risk_level)}
                        <Badge variant="outline">{threat.source_platform}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(threat.created_at).toLocaleString()}
                        </span>
                      </div>
                      <span className="text-sm font-medium">
                        {(threat.confidence_score * 100).toFixed(1)}% confidence
                      </span>
                    </div>

                    <p className="text-sm mb-2">{threat.content_text}</p>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Type: {threat.fraud_type}</span>
                      {threat.detected_keywords.length > 0 && (
                        <>
                          <span>•</span>
                          <span>Keywords: {threat.detected_keywords.slice(0, 3).join(', ')}</span>
                          {threat.detected_keywords.length > 3 && (
                            <span>+{threat.detected_keywords.length - 3} more</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {liveThreats.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No active threats detected</p>
                    <p className="text-sm">The AI patrol system is monitoring for fraud patterns</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Patrol Statistics</CardTitle>
                <CardDescription>System performance and detection metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Services:</span>
                    <span className="font-medium">{patrolStats?.system_status.total_services || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Services:</span>
                    <span className="font-medium">{patrolStats?.system_status.services_running || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Sessions:</span>
                    <span className="font-medium">{patrolStats?.system_status.active_sessions || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>System Uptime:</span>
                    <span className="font-medium">
                      {patrolStats?.system_status.system_uptime ?
                        formatUptime(patrolStats.system_status.system_uptime) : 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detection Summary</CardTitle>
                <CardDescription>Fraud detection performance overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>High Risk Alerts:</span>
                    <span className="font-medium text-red-600">
                      {liveThreats.filter(t => t.risk_level === 'HIGH').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Medium Risk Alerts:</span>
                    <span className="font-medium text-yellow-600">
                      {liveThreats.filter(t => t.risk_level === 'MEDIUM').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Threats:</span>
                    <span className="font-medium">{liveThreats.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Confidence:</span>
                    <span className="font-medium">
                      {liveThreats.length > 0 ?
                        `${(liveThreats.reduce((acc, t) => acc + t.confidence_score, 0) / liveThreats.length * 100).toFixed(1)}%` :
                        'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AIPatrolPage