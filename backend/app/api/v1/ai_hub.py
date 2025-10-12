"""
AI Hub API Endpoints
Manages scraping operations, fraud detection, and AI analysis
"""

from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text, desc, func
from typing import List, Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.dependencies import get_current_officer
from app.models.officer import Officer
from app.schemas import ApiResponse
from pydantic import BaseModel
from loguru import logger


router = APIRouter(prefix="/ai-hub", tags=["AI Hub"])


# ==================== Schemas ====================

class ScrapedPostResponse(BaseModel):
    id: int
    platform: str
    author_name: Optional[str]
    author_profile_url: Optional[str]
    content: str
    post_url: Optional[str]
    images: List[str]
    fraud_confidence: float
    fraud_type: str
    scraped_at: datetime
    is_fraudulent: bool

    class Config:
        from_attributes = True


class ScraperJobRequest(BaseModel):
    scraper_type: str  # 'facebook_feed', 'facebook_marketplace', etc.
    num_batches: int = 3
    batch_size: int = 10


class ScraperStats(BaseModel):
    total_posts_scraped: int
    fraud_detected: int
    fraud_rate: float
    last_scrape: Optional[datetime]
    posts_last_24h: int
    fraud_last_24h: int


# ==================== Endpoints ====================

@router.get("/fraud-posts", response_model=ApiResponse[dict])
async def get_fraud_posts(
    page: int = 1,
    limit: int = 20,
    platform: Optional[str] = None,
    min_confidence: float = 0.5,
    db: Session = Depends(get_db),
    current_officer: Officer = Depends(get_current_officer)
):
    """
    Get detected fraud posts
    """
    try:
        offset = (page - 1) * limit

        # Build query
        query = """
            SELECT
                id, platform, author_name, author_profile_url,
                content, post_url, media_urls as images,
                fraud_confidence, fraud_type, scraped_at, is_fraudulent,
                ai_analysis_result
            FROM ai_scraped_posts
            WHERE is_fraudulent = true
            AND fraud_confidence >= :min_confidence
        """

        if platform:
            query += " AND platform = :platform"

        query += """
            ORDER BY scraped_at DESC
            LIMIT :limit OFFSET :offset
        """

        params = {
            'min_confidence': min_confidence,
            'limit': limit,
            'offset': offset
        }

        if platform:
            params['platform'] = platform

        result = db.execute(text(query), params)
        posts = result.fetchall()

        # Count total
        count_query = """
            SELECT COUNT(*) as total
            FROM ai_scraped_posts
            WHERE is_fraudulent = true
            AND fraud_confidence >= :min_confidence
        """

        if platform:
            count_query += " AND platform = :platform"

        count_result = db.execute(text(count_query), params)
        total = count_result.fetchone()[0]

        # Format posts
        posts_data = []
        for post in posts:
            posts_data.append({
                'id': post.id,
                'platform': post.platform,
                'author_name': post.author_name,
                'author_profile_url': post.author_profile_url,
                'content': post.content,
                'post_url': post.post_url,
                'images': post.images if post.images else [],
                'fraud_confidence': float(post.fraud_confidence),
                'fraud_type': post.fraud_type,
                'scraped_at': post.scraped_at.isoformat(),
                'is_fraudulent': post.is_fraudulent,
                'ai_analysis': post.ai_analysis_result if post.ai_analysis_result else {}
            })

        return ApiResponse(
            success=True,
            data={
                'posts': posts_data,
                'total': total,
                'page': page,
                'limit': limit,
                'pages': (total + limit - 1) // limit
            }
        )

    except Exception as e:
        logger.error(f"Error fetching fraud posts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fraud-posts/{post_id}", response_model=ApiResponse[dict])
async def get_fraud_post_details(
    post_id: int,
    db: Session = Depends(get_db),
    current_officer: Officer = Depends(get_current_officer)
):
    """
    Get detailed information about a specific fraud post
    """
    try:
        query = text("""
            SELECT *
            FROM ai_scraped_posts
            WHERE id = :post_id
        """)

        result = db.execute(query, {'post_id': post_id})
        post = result.fetchone()

        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

        return ApiResponse(
            success=True,
            data={
                'id': post.id,
                'platform': post.platform,
                'author_name': post.author_name,
                'author_profile_url': post.author_profile_url,
                'author_profile_image': post.author_profile_image,
                'content': post.content,
                'post_url': post.post_url,
                'images': post.media_urls if post.media_urls else [],
                'fraud_confidence': float(post.fraud_confidence),
                'fraud_type': post.fraud_type,
                'fraud_reasons': post.fraud_reasons if post.fraud_reasons else [],
                'scraped_at': post.scraped_at.isoformat(),
                'timestamp': post.timestamp.isoformat() if post.timestamp else None,
                'is_fraudulent': post.is_fraudulent,
                'processed': post.processed,
                'ai_analysis': post.ai_analysis_result if post.ai_analysis_result else {},
                'metadata': post.metadata if post.metadata else {}
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching post details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", response_model=ApiResponse[ScraperStats])
async def get_scraper_stats(
    db: Session = Depends(get_db),
    current_officer: Officer = Depends(get_current_officer)
):
    """
    Get scraping statistics
    """
    try:
        # Total posts scraped
        total_query = text("SELECT COUNT(*) FROM ai_scraped_posts WHERE is_fraudulent = true")
        total_result = db.execute(total_query)
        total_posts = total_result.fetchone()[0]

        # Fraud detected
        fraud_query = text("SELECT COUNT(*) FROM ai_scraped_posts WHERE is_fraudulent = true")
        fraud_result = db.execute(fraud_query)
        fraud_count = fraud_result.fetchone()[0]

        # Fraud rate
        fraud_rate = (fraud_count / total_posts * 100) if total_posts > 0 else 0

        # Last scrape
        last_scrape_query = text("SELECT MAX(scraped_at) FROM ai_scraped_posts")
        last_scrape_result = db.execute(last_scrape_query)
        last_scrape = last_scrape_result.fetchone()[0]

        # Last 24h stats
        yesterday = datetime.now() - timedelta(hours=24)

        posts_24h_query = text("""
            SELECT COUNT(*) FROM ai_scraped_posts
            WHERE scraped_at >= :yesterday AND is_fraudulent = true
        """)
        posts_24h_result = db.execute(posts_24h_query, {'yesterday': yesterday})
        posts_24h = posts_24h_result.fetchone()[0]

        fraud_24h_query = text("""
            SELECT COUNT(*) FROM ai_scraped_posts
            WHERE scraped_at >= :yesterday AND is_fraudulent = true
        """)
        fraud_24h_result = db.execute(fraud_24h_query, {'yesterday': yesterday})
        fraud_24h = fraud_24h_result.fetchone()[0]

        stats = ScraperStats(
            total_posts_scraped=total_posts,
            fraud_detected=fraud_count,
            fraud_rate=fraud_rate,
            last_scrape=last_scrape,
            posts_last_24h=posts_24h,
            fraud_last_24h=fraud_24h
        )

        return ApiResponse(success=True, data=stats)

    except Exception as e:
        logger.error(f"Error fetching scraper stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/run-scraper", response_model=ApiResponse[dict])
async def run_scraper(
    request: ScraperJobRequest,
    background_tasks: BackgroundTasks,
    current_officer: Officer = Depends(get_current_officer)
):
    """
    Trigger a scraping job
    Runs in background and returns immediately
    """
    try:
        scraper_type = request.scraper_type

        logger.info(f"Officer {current_officer.badge_number} triggered {scraper_type} scraper")

        # Add scraping task to background
        if scraper_type == 'facebook_feed':
            background_tasks.add_task(
                _run_facebook_feed_scraper,
                request.num_batches,
                request.batch_size
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Scraper type '{scraper_type}' not implemented yet"
            )

        return ApiResponse(
            success=True,
            data={
                'message': f'{scraper_type} scraper started in background',
                'scraper': scraper_type,
                'batches': request.num_batches,
                'batch_size': request.batch_size,
                'started_by': current_officer.badge_number
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting scraper: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/fraud-posts/{post_id}", response_model=ApiResponse[dict])
async def delete_fraud_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_officer: Officer = Depends(get_current_officer)
):
    """
    Delete a fraud post (mark as false positive)
    """
    try:
        query = text("""
            UPDATE ai_scraped_posts
            SET is_fraudulent = false,
                metadata = jsonb_set(
                    COALESCE(metadata, '{}'::jsonb),
                    '{marked_false_positive}',
                    'true'::jsonb
                )
            WHERE id = :post_id
            RETURNING id
        """)

        result = db.execute(query, {'post_id': post_id})
        db.commit()

        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Post not found")

        logger.info(f"Post {post_id} marked as false positive by {current_officer.badge_number}")

        return ApiResponse(
            success=True,
            data={'message': 'Post marked as false positive', 'post_id': post_id}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting post: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Background Tasks ====================

async def _run_facebook_feed_scraper(num_batches: int, batch_size: int):
    """Background task to run Facebook feed scraper"""
    try:
        from app.scrapers.facebook.feed_scraper import FacebookFeedScraper

        # TODO: Get credentials from environment or config
        EMAIL = "your_email@example.com"
        PASSWORD = "your_password"

        scraper = FacebookFeedScraper(
            email=EMAIL,
            password=PASSWORD,
            headless=True,  # Run headless in background
            batch_size=batch_size
        )

        logger.info(f"Starting Facebook feed scraper: {num_batches} batches")
        result = await scraper.scrape_feed(num_batches=num_batches)

        logger.info(f"Scraper completed: {result}")

    except Exception as e:
        logger.error(f"Background scraper error: {str(e)}")
