# GAUR Frontend API Requirements Documentation

## Overview
This document outlines all API endpoints that the Next.js frontend expects from the backend.

## Base Configuration
- **API Base URL**: `http://localhost:8000/api/v1`
- **Authentication**: Bearer token in `Authorization` header
- **Content-Type**: `application/json`
- **CORS**: Must allow `http://localhost:3000` (and other Next.js ports)

## Response Format Standard
All API responses follow this structure:

### Success Response
```json
{
  "success": true,
  "data": {...} or [...],
  "message": "Optional success message",
  "timestamp": "2025-10-10T12:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "message": "Error message (alternative)",
  "detail": "Detailed error info (alternative)",
  "timestamp": "2025-10-10T12:00:00.000Z"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "size": 20,
    "pages": 5,
    "has_next": true,
    "has_prev": false
  },
  "timestamp": "2025-10-10T12:00:00.000Z"
}
```

## Authentication Endpoints

### 1. POST /api/v1/auth/login
Login officer with credentials.

**Request Body:**
```json
{
  "badge_number": "TEST001",
  "password": "testpass123",
  "two_factor_code": "123456" // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbG...",
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbG...",
    "token_type": "Bearer",
    "expires_in": 1800,
    "officer": {
      "officer_id": "uuid",
      "badge_number": "TEST001",
      "name": "Officer Name",
      "rank": "Inspector",
      "department": "Cyber Crime",
      "active": true,
      "created_at": "2025-01-01T00:00:00Z",
      "last_login": "2025-10-10T12:00:00Z",
      "two_factor_enabled": false,
      "roles": [
        {
          "id": 1,
          "name": "inspector",
          "display_name": "Inspector",
          "description": "Inspector role",
          "level": 2
        }
      ],
      "permissions": [
        {
          "name": "alerts:read",
          "resource": "alerts",
          "action": "read",
          "description": "View fraud alerts"
        }
      ],
      "role_names": ["inspector"],
      "minimum_role_level": 2
    }
  }
}
```

### 2. POST /api/v1/auth/logout
Logout current officer.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 3. POST /api/v1/auth/refresh
Refresh access token.

**Request Body:**
```json
{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbG..."
}
```

**Response:** Same as login response with new tokens

### 4. GET /api/v1/auth/profile
Get current officer profile.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    // Same officer object as in login response
  }
}
```

## System Endpoints

### 5. GET /api/v1/health
Health check endpoint.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected",
    "services": {
      "api": "running",
      "ai": "running",
      "scrapers": "stopped"
    }
  }
}
```

## Threat/Alert Endpoints

### 6. GET /api/v1/threats
List fraud alerts/threats.

**Query Parameters:**
- `page` (int, default: 1)
- `limit` (int, default: 20)
- `severity` (string: HIGH, MEDIUM, LOW)
- `platform` (string: facebook, telegram)
- `status` (string: open, assigned, resolved)
- `date_from` (ISO date)
- `date_to` (ISO date)

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "content_id": "post_123",
        "alert_type": "investment_scam",
        "confidence_score": 0.95,
        "risk_level": "HIGH",
        "source_platform": "facebook",
        "content_text": "Invest 10,000 get 1 lakh...",
        "created_at": "2025-10-10T12:00:00Z",
        "status": "open",
        "assigned_officer_id": null,
        "priority_level": "HIGH",
        "fraud_type": "investment_fraud",
        "detected_patterns": ["advance payment", "high returns"],
        "media_urls": ["http://..."]
      }
    ],
    "total": 100,
    "page": 1,
    "size": 20,
    "pages": 5
  }
}
```

### 7. GET /api/v1/threats/stats
Get threat statistics.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "total_threats": 150,
    "level_counts": {
      "HIGH": 25,
      "MEDIUM": 75,
      "LOW": 50
    },
    "assignment_stats": {
      "assigned": 100,
      "unassigned": 50
    },
    "recent_24h": 15,
    "status_counts": {
      "open": 75,
      "assigned": 50,
      "resolved": 25
    },
    "platform_distribution": {
      "facebook": 100,
      "telegram": 50
    }
  }
}
```

### 8. POST /api/v1/threats/{id}/assign
Assign threat to officer.

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "officer_badge": "TEST001"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "assigned_officer_id": "uuid",
    "assigned_at": "2025-10-10T12:00:00Z"
  }
}
```

### 9. PUT /api/v1/threats/{id}/status
Update threat status.

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "status": "resolved",
  "notes": "Investigated and confirmed as fraud"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "resolved",
    "updated_at": "2025-10-10T12:00:00Z"
  }
}
```

## Evidence Endpoints

### 10. GET /api/v1/evidence
List evidence entries.

**Query Parameters:**
- `page`, `limit`, `platform`, `date_from`, `date_to`
- `category` (string: investment_scam, fake_hotel, etc.)

**Headers:** `Authorization: Bearer {token}`

**Response:** Similar paginated structure as threats

### 11. GET /api/v1/evidence/stats
Get evidence statistics.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "total_evidence": 200,
    "by_category": {
      "investment_scam": 50,
      "fake_hotel": 30
    },
    "recent_24h": 10
  }
}
```

### 12. POST /api/v1/evidence
Create new evidence entry.

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "title": "Evidence title",
  "description": "Evidence description",
  "category": "investment_scam",
  "source_url": "https://...",
  "metadata": {...}
}
```

### 13. POST /api/v1/evidence/{id}/custody
Add chain of custody entry.

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "action": "transferred",
  "notes": "Transferred to forensics"
}
```

### 14. GET /api/v1/evidence/{id}/verify
Verify evidence integrity.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "hash": "sha256...",
    "original_hash": "sha256...",
    "tampered": false
  }
}
```

### 15. POST /api/v1/evidence/export
Export evidence for reports.

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "evidence_ids": [1, 2, 3],
  "format": "pdf"
}
```

## Admin Endpoints

### 16. GET /api/v1/admin/officers
List all officers.

**Query Parameters:** `page`, `limit`, `rank`, `station`, `status`

**Headers:** `Authorization: Bearer {token}`

**Response:** Paginated list of officers

### 17. POST /api/v1/admin/officers
Create new officer.

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "badge_number": "TEST002",
  "name": "New Officer",
  "rank": "Constable",
  "department": "Cyber Crime",
  "password": "password123",
  "roles": [1]
}
```

### 18. PUT /api/v1/admin/officers/{id}
Update officer details.

**Headers:** `Authorization: Bearer {token}`

**Request Body:** Partial officer object

### 19. POST /api/v1/admin/officers/{id}/roles
Assign/remove roles.

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "role_ids": [1, 2, 3]
}
```

### 20. GET /api/v1/admin/officers/stats
Get officer statistics.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "total_officers": 50,
    "active_officers": 45,
    "by_rank": {...}
  }
}
```

### 21. GET /api/v1/admin/roles
Get all roles with permissions.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "inspector",
      "display_name": "Inspector",
      "level": 2,
      "permissions": [...]
    }
  ]
}
```

### 22. GET /api/v1/admin/permissions
Get all permissions.

**Headers:** `Authorization: Bearer {token}`

**Response:** List of all permission objects

### 23. GET /api/v1/admin/activity-logs
Get activity logs.

**Query Parameters:** `page`, `limit`, `officer_id`, `action`, `date_from`

**Headers:** `Authorization: Bearer {token}`

**Response:** Paginated activity logs

### 24. GET /api/v1/admin/roles/{role_id}/permissions
Get role permissions.

**Headers:** `Authorization: Bearer {token}`

**Response:** List of permission IDs for the role

### 25. PUT /api/v1/admin/roles/{role_id}/permissions
Update role permissions.

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "permission_ids": [1, 2, 3, 4]
}
```

## AI Patrol Endpoints

### 26. GET /api/v1/ai/patrol/services/status
Get status of all AI patrol services.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "services": {
      "facebook_scraper": {
        "name": "facebook_scraper",
        "status": "running",
        "last_started": "2025-10-10T10:00:00Z",
        "uptime_seconds": 7200,
        "pid": 12345,
        "stats": {}
      },
      "telegram_scraper": {...},
      "ai_analyzer": {...}
    }
  }
}
```

### 27. GET /api/v1/ai/patrol/stats
Get AI patrol statistics.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "system_status": {
      "services_running": 2,
      "total_services": 4,
      "system_uptime": 7200,
      "active_sessions": 1
    },
    "active_sessions": {},
    "service_statistics": {}
  }
}
```

### 28. GET /api/v1/ai/threats/live
Get live threats from AI analysis.

**Query Parameters:** `limit` (default: 10)

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "source_platform": "facebook",
      "content_text": "...",
      "risk_level": "HIGH",
      "fraud_type": "investment_scam",
      "confidence_score": 0.95,
      "created_at": "2025-10-10T12:00:00Z",
      "detected_keywords": ["advance", "payment"]
    }
  ]
}
```

### 29. POST /api/v1/ai/patrol/services/{service_name}/start
Start an AI patrol service.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "message": "Service started",
  "data": {
    "service": "facebook_scraper",
    "status": "starting"
  }
}
```

### 30. POST /api/v1/ai/patrol/services/{service_name}/stop
Stop an AI patrol service.

**Headers:** `Authorization: Bearer {token}`

**Response:** Similar to start response

### 31. POST /api/v1/ai/patrol/session/start
Start a complete AI patrol session.

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "services": ["facebook_scraper", "telegram_scraper", "ai_analyzer"],
  "config": {
    "scrape_interval": 3600,
    "enable_real_time": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "uuid",
    "started_at": "2025-10-10T12:00:00Z"
  }
}
```

## Storage Requirements

### Token Storage (localStorage)
- `gaur_access_token`: Access token for API requests
- `gaur_refresh_token`: Refresh token for token renewal
- `gaur-auth-storage`: Zustand persist state with officer info

## Security Requirements
1. All authenticated endpoints must verify JWT token
2. CORS must allow frontend origins
3. Passwords must be hashed with bcrypt
4. Activity logging for all admin actions
5. Rate limiting on login endpoint
6. 2FA support (optional but structure ready)

## Database Tables Used by Frontend
From existing database schema:
- `officers`: Officer accounts
- `roles`: Role definitions
- `permissions`: Permission definitions
- `officer_roles`: Many-to-many officer-role
- `fraud_alerts`: Threat/alert data
- `ai_fraud_alerts`: AI-generated alerts
- `evidence`: Evidence entries
- `custody_chain`: Chain of custody
- `activity_logs`: Audit trail
- `ai_services`: AI service status
- `ai_patrol_sessions`: Patrol session tracking
- `ai_scraped_posts`: Scraped social media content
- `monitored_groups`: Groups being monitored

## Key Frontend Dependencies
- Next.js 15.5.3
- React 18.3.1
- TanStack React Query v5 (for data fetching)
- Zustand (for auth state)
- Axios (for HTTP requests)
- shadcn/ui + Radix UI (UI components)

## Notes
- Frontend runs on port 3000 (or auto-assigned)
- Backend must run on port 8000
- API docs at /docs and /redoc
- Frontend expects consistent error format across all endpoints
- All timestamps should be ISO 8601 format
- Pagination is required for list endpoints
