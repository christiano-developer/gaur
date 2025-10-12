"""
Admin API endpoints - Officer and role management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, timedelta
from loguru import logger

from app.database import get_db
from app.dependencies import get_current_officer, require_permission
from app.models import Officer, Role, Permission, ActivityLog
from app.schemas import ApiResponse, OfficerResponse
from app.utils import hash_password


router = APIRouter(prefix="/admin", tags=["Admin"])


# ==================== Officer Management ====================

@router.get("/officers/stats", response_model=ApiResponse[dict])
async def get_officer_stats(
    current_officer: Officer = Depends(require_permission("users", "read")),
    db: Session = Depends(get_db)
):
    """
    Get officer statistics for admin dashboard.

    Requires: users:read permission
    """
    try:
        # Total officers
        total_officers = db.query(Officer).count()

        # Active/Inactive officers
        active_officers = db.query(Officer).filter(Officer.active == True).count()
        inactive_officers = total_officers - active_officers

        # Role distribution
        role_dist = db.query(
            Role.name,
            func.count(Officer.officer_id)
        ).join(
            Officer.roles
        ).group_by(Role.name).all()

        role_distribution = {role: count for role, count in role_dist}

        # Recent additions (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_additions = db.query(Officer).filter(
            Officer.created_at >= thirty_days_ago
        ).count()

        stats = {
            "total_officers": total_officers,
            "active_officers": active_officers,
            "inactive_officers": inactive_officers,
            "role_distribution": role_distribution,
            "recent_additions": recent_additions
        }

        return ApiResponse(
            success=True,
            data=stats
        )

    except Exception as e:
        logger.error(f"Error fetching officer stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch officer statistics"
        )


@router.get("/officers", response_model=ApiResponse[dict])
async def list_officers(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    rank: Optional[str] = None,
    station: Optional[str] = None,
    active: Optional[bool] = None,
    role: Optional[str] = None,
    current_officer: Officer = Depends(require_permission("users", "read")),
    db: Session = Depends(get_db)
):
    """
    List all officers with pagination and filtering.

    Requires: users:read permission
    """
    try:
        # Build base query
        query = db.query(Officer)

        # Apply filters
        if search:
            query = query.filter(
                (Officer.name.ilike(f"%{search}%")) |
                (Officer.badge_number.ilike(f"%{search}%"))
            )

        if rank:
            query = query.filter(Officer.rank == rank)

        if active is not None:
            query = query.filter(Officer.active == active)

        if role:
            query = query.join(Officer.roles).filter(Role.name == role)

        # Get total count
        total = query.count()

        # Apply pagination
        offset = (page - 1) * limit
        officers = query.order_by(desc(Officer.created_at)).offset(offset).limit(limit).all()

        # Convert to response format
        officers_data = [OfficerResponse.model_validate(officer) for officer in officers]

        return ApiResponse(
            success=True,
            data={
                "officers": [officer.model_dump() for officer in officers_data],
                "total": total,
                "page": page,
                "limit": limit,
                "pages": (total + limit - 1) // limit
            }
        )

    except Exception as e:
        logger.error(f"Error listing officers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list officers"
        )


@router.get("/officers/{officer_id}", response_model=ApiResponse[OfficerResponse])
async def get_officer(
    officer_id: str,
    current_officer: Officer = Depends(require_permission("users", "read")),
    db: Session = Depends(get_db)
):
    """
    Get single officer details.

    Requires: users:read permission
    """
    try:
        officer = db.query(Officer).filter(Officer.officer_id == officer_id).first()

        if not officer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Officer not found"
            )

        officer_data = OfficerResponse.model_validate(officer)

        return ApiResponse(
            success=True,
            data=officer_data
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching officer: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch officer"
        )


@router.post("/officers", response_model=ApiResponse[OfficerResponse])
async def create_officer(
    officer_data: dict,
    current_officer: Officer = Depends(require_permission("users", "create")),
    db: Session = Depends(get_db)
):
    """
    Create a new officer.

    Requires: users:create permission
    """
    try:
        # Check if badge number already exists
        existing = db.query(Officer).filter(
            Officer.badge_number == officer_data.get("badge_number")
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Badge number already exists"
            )

        # Hash password
        password = officer_data.get("password", "changeme123")
        password_hash = hash_password(password)

        # Create officer
        new_officer = Officer(
            badge_number=officer_data["badge_number"],
            name=officer_data["name"],
            rank=officer_data["rank"],
            department=officer_data.get("department", "Cyber Crime"),
            password_hash=password_hash,
            active=officer_data.get("active", True),
            two_factor_enabled=False
        )

        db.add(new_officer)
        db.flush()

        # Assign roles if provided
        role_ids = officer_data.get("role_ids", [])
        if role_ids:
            roles = db.query(Role).filter(Role.id.in_(role_ids)).all()
            new_officer.roles = roles

        # Log activity
        activity_log = ActivityLog(
            officer_id=current_officer.officer_id,
            action="officer_created",
            resource_type="officers",
            resource_id=new_officer.officer_id,
            details={
                "created_by": current_officer.badge_number,
                "new_officer_badge": new_officer.badge_number,
                "new_officer_name": new_officer.name
            }
        )
        db.add(activity_log)

        db.commit()
        db.refresh(new_officer)

        officer_response = OfficerResponse.model_validate(new_officer)

        logger.info(f"Officer created: {new_officer.badge_number} by {current_officer.badge_number}")

        return ApiResponse(
            success=True,
            data=officer_response,
            message="Officer created successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating officer: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create officer: {str(e)}"
        )


@router.put("/officers/{officer_id}", response_model=ApiResponse[OfficerResponse])
async def update_officer(
    officer_id: str,
    officer_data: dict,
    current_officer: Officer = Depends(require_permission("users", "update")),
    db: Session = Depends(get_db)
):
    """
    Update officer details.

    Requires: users:update permission
    """
    try:
        officer = db.query(Officer).filter(Officer.officer_id == officer_id).first()

        if not officer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Officer not found"
            )

        # Update allowed fields
        if "name" in officer_data:
            officer.name = officer_data["name"]
        if "rank" in officer_data:
            officer.rank = officer_data["rank"]
        if "department" in officer_data:
            officer.department = officer_data["department"]
        if "active" in officer_data:
            officer.active = officer_data["active"]

        # Log activity
        activity_log = ActivityLog(
            officer_id=current_officer.officer_id,
            action="officer_updated",
            resource_type="officers",
            resource_id=officer_id,
            details={
                "updated_by": current_officer.badge_number,
                "updated_fields": list(officer_data.keys())
            }
        )
        db.add(activity_log)

        db.commit()
        db.refresh(officer)

        officer_response = OfficerResponse.model_validate(officer)

        logger.info(f"Officer updated: {officer.badge_number} by {current_officer.badge_number}")

        return ApiResponse(
            success=True,
            data=officer_response,
            message="Officer updated successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating officer: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update officer"
        )


@router.post("/officers/{officer_id}/roles", response_model=ApiResponse[OfficerResponse])
async def assign_officer_roles(
    officer_id: str,
    role_data: dict,
    current_officer: Officer = Depends(require_permission("roles", "assign")),
    db: Session = Depends(get_db)
):
    """
    Assign roles to an officer.

    Requires: roles:assign permission
    """
    try:
        officer = db.query(Officer).filter(Officer.officer_id == officer_id).first()

        if not officer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Officer not found"
            )

        role_ids = role_data.get("role_ids", [])
        roles = db.query(Role).filter(Role.id.in_(role_ids)).all()

        if len(roles) != len(role_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more invalid role IDs"
            )

        officer.roles = roles

        # Log activity
        activity_log = ActivityLog(
            officer_id=current_officer.officer_id,
            action="roles_assigned",
            resource_type="officers",
            resource_id=officer_id,
            details={
                "assigned_by": current_officer.badge_number,
                "officer_badge": officer.badge_number,
                "role_ids": role_ids,
                "role_names": [role.name for role in roles]
            }
        )
        db.add(activity_log)

        db.commit()
        db.refresh(officer)

        officer_response = OfficerResponse.model_validate(officer)

        logger.info(f"Roles assigned to {officer.badge_number} by {current_officer.badge_number}")

        return ApiResponse(
            success=True,
            data=officer_response,
            message="Roles assigned successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error assigning roles: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to assign roles"
        )


# ==================== Role Management ====================

@router.get("/roles", response_model=ApiResponse[List[dict]])
async def list_roles(
    current_officer: Officer = Depends(require_permission("roles", "manage")),
    db: Session = Depends(get_db)
):
    """
    Get all roles with their permissions.

    Requires: roles:manage permission
    """
    try:
        roles = db.query(Role).order_by(Role.level).all()

        roles_data = []
        for role in roles:
            roles_data.append({
                "id": role.id,
                "name": role.name,
                "display_name": role.display_name,
                "description": role.description,
                "level": role.level,
                "permissions": [
                    {
                        "id": perm.id,
                        "name": perm.name,
                        "resource": perm.resource,
                        "action": perm.action,
                        "description": perm.description
                    }
                    for perm in role.permissions
                ]
            })

        return ApiResponse(
            success=True,
            data=roles_data
        )

    except Exception as e:
        logger.error(f"Error listing roles: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list roles"
        )


@router.get("/permissions", response_model=ApiResponse[List[dict]])
async def list_permissions(
    current_officer: Officer = Depends(require_permission("roles", "manage")),
    db: Session = Depends(get_db)
):
    """
    Get all available permissions.

    Requires: roles:manage permission
    """
    try:
        permissions = db.query(Permission).order_by(Permission.resource, Permission.action).all()

        perms_data = [
            {
                "id": perm.id,
                "name": perm.name,
                "resource": perm.resource,
                "action": perm.action,
                "description": perm.description
            }
            for perm in permissions
        ]

        return ApiResponse(
            success=True,
            data=perms_data
        )

    except Exception as e:
        logger.error(f"Error listing permissions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list permissions"
        )


# ==================== Activity Logs ====================

@router.get("/activity-logs", response_model=ApiResponse[dict])
async def get_activity_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    action: Optional[str] = None,
    officer_id: Optional[str] = None,
    current_officer: Officer = Depends(require_permission("logs", "read")),
    db: Session = Depends(get_db)
):
    """
    Get activity logs with pagination and filtering.

    Requires: logs:read permission
    """
    try:
        query = db.query(ActivityLog)

        if action:
            query = query.filter(ActivityLog.action.ilike(f"%{action}%"))

        if officer_id:
            query = query.filter(ActivityLog.officer_id == officer_id)

        total = query.count()

        offset = (page - 1) * limit
        logs = query.order_by(desc(ActivityLog.timestamp)).offset(offset).limit(limit).all()

        logs_data = [
            {
                "id": log.id,
                "officer_id": log.officer_id,
                "action": log.action,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "details": log.details
            }
            for log in logs
        ]

        return ApiResponse(
            success=True,
            data={
                "logs": logs_data,
                "total": total,
                "page": page,
                "limit": limit,
                "pages": (total + limit - 1) // limit
            }
        )

    except Exception as e:
        logger.error(f"Error fetching activity logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch activity logs"
        )
