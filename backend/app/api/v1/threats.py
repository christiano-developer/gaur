"""
Threats API Endpoints
Fetch and manage fraud alerts from ai_fraud_alerts table
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import List, Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.schemas import ApiResponse

router = APIRouter(prefix="/threats", tags=["threats"])


@router.get("")
async def get_threats(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    risk_level: Optional[str] = Query(None),
    fraud_type: Optional[str] = Query(None),
    status: Optional[str] = Query("open"),
    db: Session = Depends(get_db)
):
    """
    Get paginated list of fraud threats from ai_fraud_alerts

    Query Parameters:
    - page: Page number (default: 1)
    - size: Items per page (default: 10, max: 100)
    - risk_level: Filter by risk level (HIGH, MEDIUM, LOW)
    - fraud_type: Filter by fraud type
    - status: Filter by status (open, investigating, resolved)
    """
    try:
        # Build query
        query = """
            SELECT
                id,
                source_platform,
                source_id,
                content_text,
                confidence_score,
                risk_level,
                fraud_type,
                detected_keywords,
                ai_metadata,
                status,
                created_at,
                resolved_at
            FROM ai_fraud_alerts
            WHERE 1=1
        """

        params = {}

        # Apply filters
        if risk_level:
            query += " AND risk_level = :risk_level"
            params['risk_level'] = risk_level

        if fraud_type:
            query += " AND fraud_type = :fraud_type"
            params['fraud_type'] = fraud_type

        if status:
            query += " AND status = :status"
            params['status'] = status

        # Order by most recent
        query += " ORDER BY created_at DESC"

        # Get total count
        count_query = f"SELECT COUNT(*) as total FROM ({query}) as subquery"
        total_result = db.execute(text(count_query), params)
        total = total_result.scalar()

        # Apply pagination
        offset = (page - 1) * size
        query += " LIMIT :limit OFFSET :offset"
        params['limit'] = size
        params['offset'] = offset

        # Execute query
        result = db.execute(text(query), params)
        rows = result.fetchall()

        # Convert to list of dicts
        threats = []
        for row in rows:
            threats.append({
                'id': row[0],
                'source_platform': row[1],
                'source_id': row[2],
                'content_text': row[3],
                'confidence_score': float(row[4]) if row[4] else 0.0,
                'risk_level': row[5],
                'fraud_type': row[6],
                'detected_keywords': row[7],  # JSON
                'ai_metadata': row[8],  # JSON
                'status': row[9],
                'created_at': row[10].isoformat() if row[10] else None,
                'resolved_at': row[11].isoformat() if row[11] else None,
            })

        return ApiResponse(
            success=True,
            data={
                'threats': threats,
                'pagination': {
                    'page': page,
                    'size': size,
                    'total': total,
                    'total_pages': (total + size - 1) // size
                }
            }
        )

    except Exception as e:
        import traceback
        print(f"Error fetching threats: {str(e)}")
        print(traceback.format_exc())
        return ApiResponse(
            success=False,
            error=f"Failed to fetch threats: {str(e)}",
            data={'threats': [], 'pagination': {'page': page, 'size': size, 'total': 0, 'total_pages': 0}}
        )


@router.get("/stats")
async def get_threat_stats(db: Session = Depends(get_db)):
    """
    Get threat statistics for dashboard

    Returns:
    - Total threats
    - By risk level (HIGH, MEDIUM, LOW)
    - By fraud type
    - By status
    - Recent activity (last 7 days)
    """
    try:
        # Total threats
        total_query = "SELECT COUNT(*) FROM ai_fraud_alerts"
        total = db.execute(text(total_query)).scalar()

        # By risk level
        risk_query = """
            SELECT risk_level, COUNT(*) as count
            FROM ai_fraud_alerts
            GROUP BY risk_level
        """
        risk_result = db.execute(text(risk_query))
        by_risk = {row[0]: row[1] for row in risk_result}

        # By fraud type
        type_query = """
            SELECT fraud_type, COUNT(*) as count
            FROM ai_fraud_alerts
            GROUP BY fraud_type
            ORDER BY count DESC
            LIMIT 10
        """
        type_result = db.execute(text(type_query))
        by_type = [{'type': row[0], 'count': row[1]} for row in type_result]

        # By status
        status_query = """
            SELECT status, COUNT(*) as count
            FROM ai_fraud_alerts
            GROUP BY status
        """
        status_result = db.execute(text(status_query))
        by_status = {row[0]: row[1] for row in status_result}

        # Recent activity (last 7 days)
        recent_query = """
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM ai_fraud_alerts
            WHERE created_at >= :start_date
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        """
        start_date = datetime.now() - timedelta(days=7)
        recent_result = db.execute(text(recent_query), {'start_date': start_date})
        recent_activity = [{'date': row[0].isoformat(), 'count': row[1]} for row in recent_result]

        # Heatmap data (last 90 days, grouped by day)
        heatmap_query = """
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM ai_fraud_alerts
            WHERE created_at >= :start_date
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        """
        heatmap_start = datetime.now() - timedelta(days=90)
        heatmap_result = db.execute(text(heatmap_query), {'start_date': heatmap_start})
        heatmap_data = [{'date': row[0].isoformat(), 'count': row[1]} for row in heatmap_result]

        return ApiResponse(
            success=True,
            data={
                'total': total,
                'by_risk': by_risk,
                'by_type': by_type,
                'by_status': by_status,
                'recent_activity': recent_activity,
                'heatmap': heatmap_data
            }
        )

    except Exception as e:
        import traceback
        print(f"Error fetching threat stats: {str(e)}")
        print(traceback.format_exc())
        return ApiResponse(
            success=False,
            error=f"Failed to fetch threat stats: {str(e)}",
            data={}
        )


@router.put("/{threat_id}/status")
async def update_threat_status(
    threat_id: int,
    status: str = Query(..., regex="^(open|investigating|resolved)$"),
    db: Session = Depends(get_db)
):
    """
    Update threat status

    Path Parameters:
    - threat_id: ID of the threat

    Query Parameters:
    - status: New status (open, investigating, resolved)
    """
    try:
        query = """
            UPDATE ai_fraud_alerts
            SET status = :status
            WHERE id = :threat_id
            RETURNING id
        """

        result = db.execute(text(query), {'status': status, 'threat_id': threat_id})
        db.commit()

        updated = result.fetchone()

        if updated:
            return ApiResponse(
                success=True,
                data={'id': updated[0], 'status': status}
            )
        else:
            return ApiResponse(
                success=False,
                error=f"Threat {threat_id} not found"
            )

    except Exception as e:
        db.rollback()
        return ApiResponse(
            success=False,
            error=f"Failed to update threat status: {str(e)}"
        )
