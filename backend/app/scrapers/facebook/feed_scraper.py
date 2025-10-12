"""
Facebook Feed Scraper with Batch AI Processing
Scrapes Facebook feed, processes in batches with AI, keeps only fraud posts
"""

import asyncio
import logging
from typing import List, Dict
from datetime import datetime
from .base_scraper import FacebookBaseScraper
from app.database import get_db
from sqlalchemy import text

logger = logging.getLogger(__name__)


class FacebookFeedScraper(FacebookBaseScraper):
    """
    Facebook Feed Scraper with batch processing
    Flow:
    1. Scrape 10-20 posts from feed
    2. Pause while AI processes batch
    3. Keep only fraud posts, delete rest
    4. Repeat
    """

    def __init__(
        self, email: str, password: str, headless: bool = False, batch_size: int = 10
    ):
        super().__init__(email, password, headless)
        self.batch_size = batch_size
        self.total_scraped = 0
        self.total_fraud_detected = 0

    async def scrape_feed(self, num_batches: int = 5) -> Dict:
        """
        Scrape Facebook feed in batches
        Args:
            num_batches: Number of batches to scrape (each batch = ~10 posts)
        Returns:
            {
                'total_scraped': int,
                'total_fraud_detected': int,
                'fraud_posts': [...]
            }
        """
        try:
            await self.start()

            if not await self.login_facebook():
                logger.error("Login failed, cannot proceed")
                return {"error": "Login failed"}

            logger.info(
                f"Starting feed scraping: {num_batches} batches of {self.batch_size} posts each"
            )

            # Navigate to feed
            await self.page.goto("https://www.facebook.com/", wait_until="networkidle")
            await self.human_delay(3, 5)

            all_fraud_posts = []

            for batch_num in range(num_batches):
                logger.info(f"\n{'=' * 60}")
                logger.info(f"BATCH {batch_num + 1}/{num_batches}")
                logger.info(f"{'=' * 60}")

                # Scrape one batch
                batch_posts = await self._scrape_batch()

                if not batch_posts:
                    logger.warning(
                        f"No posts scraped in batch {batch_num + 1}, skipping..."
                    )
                    continue

                logger.info(f"Scraped {len(batch_posts)} posts in this batch")
                logger.info("⏸️  PAUSING for AI analysis...")

                # Process batch with AI
                fraud_posts = await self._process_batch_with_ai(batch_posts)

                logger.info(
                    f"✅ AI Analysis complete: {len(fraud_posts)}/{len(batch_posts)} fraud detected"
                )

                all_fraud_posts.extend(fraud_posts)
                self.total_fraud_detected += len(fraud_posts)

                # Scroll down for next batch
                if batch_num < num_batches - 1:
                    logger.info("Scrolling for next batch...")
                    await self.human_scroll(distance=1500, num_scrolls=2)
                    await self.human_delay(3, 5)

            logger.info(f"\n{'=' * 60}")
            logger.info(f"SCRAPING COMPLETE")
            logger.info(f"Total scraped: {self.total_scraped}")
            logger.info(f"Total fraud detected: {self.total_fraud_detected}")
            logger.info(
                f"Fraud rate: {(self.total_fraud_detected / self.total_scraped * 100) if self.total_scraped > 0 else 0:.1f}%"
            )
            logger.info(f"{'=' * 60}\n")

            await self.stop()

            return {
                "total_scraped": self.total_scraped,
                "total_fraud_detected": self.total_fraud_detected,
                "fraud_posts": all_fraud_posts,
            }

        except Exception as e:
            logger.error(f"Feed scraping error: {str(e)}")
            await self.stop()
            return {"error": str(e)}

    async def _scrape_batch(self) -> List[Dict]:
        """Scrape one batch of posts from current viewport"""
        posts_data = []

        try:
            # Wait much longer for Facebook's lazy loading
            logger.info("⏳ Waiting for posts to fully load (10 seconds)...")
            await asyncio.sleep(10)

            # Scroll slightly to trigger lazy loading
            await self.page.evaluate("window.scrollBy(0, 100)")
            await asyncio.sleep(2)
            await self.page.evaluate("window.scrollBy(0, -100)")
            await asyncio.sleep(2)

            # DEBUG: Save screenshot to see what we're scraping
            await self.page.screenshot(path='debug_facebook_feed.png')
            logger.info("📸 Screenshot saved: debug_facebook_feed.png")

            # Get all visible post article elements
            post_elements = await self.page.query_selector_all('div[role="article"]')

            logger.info(f"Found {len(post_elements)} post containers")

            # Filter out loading placeholders by checking for actual text content
            actual_posts = []
            for elem in post_elements:
                try:
                    # Check if this element has any visible text
                    text = await elem.inner_text()
                    if text and len(text.strip()) > 20:  # Has meaningful text
                        actual_posts.append(elem)
                        logger.debug(f"✅ Found post with {len(text)} characters of text")
                    else:
                        logger.debug(f"❌ Skipping element with no text content")
                except:
                    pass

            post_elements = actual_posts
            logger.info(f"Found {len(post_elements)} actual posts with content (after filtering)")

            # Extract data from each post
            for idx, post_elem in enumerate(post_elements[: self.batch_size]):
                try:
                    post_data = await self.extract_post_data(post_elem)

                    if post_data:
                        content = post_data.get('content') or ''
                        logger.debug(f"  Post {idx + 1} raw data: author={post_data.get('author_name')}, content_length={len(content)}")

                        if post_data.get("content"):
                            post_data["batch_index"] = idx
                            posts_data.append(post_data)
                            logger.info(
                                f"  ✓ Post {idx + 1}: {post_data['author_name']} - {post_data['content'][:50]}..."
                            )
                        else:
                            logger.warning(f"  ✗ Post {idx + 1}: No content found (author: {post_data.get('author_name', 'Unknown')})")
                    else:
                        logger.warning(f"  ✗ Post {idx + 1}: extract_post_data returned None")

                except Exception as e:
                    logger.error(f"Error extracting post {idx}: {str(e)}")
                    continue

            self.total_scraped += len(posts_data)

        except Exception as e:
            logger.error(f"Error scraping batch: {str(e)}")

        return posts_data

    async def _process_batch_with_ai(self, posts: List[Dict]) -> List[Dict]:
        """
        Process batch with AI fraud detection
        Only keeps fraud posts, discards rest
        """
        fraud_posts = []

        try:
            # Import AI detector (lazy import to avoid circular dependencies)
            from app.ai.fraud_detector import FraudDetector

            detector = FraudDetector()

            for idx, post in enumerate(posts):
                logger.info(f"  Analyzing post {idx + 1}/{len(posts)}...")

                # Get post content
                content = post.get("content", "")

                if not content:
                    logger.warning("    No content, skipping")
                    continue

                # AI Analysis
                ai_result = await detector.analyze_text(content)

                fraud_score = ai_result.get("fraud_score", 0.0)
                risk_level = ai_result.get("risk_level", "LOW")
                fraud_type = ai_result.get("fraud_type", "unknown")

                logger.info(
                    f"    Score: {fraud_score:.3f} | Risk: {risk_level} | Type: {fraud_type}"
                )

                # Check if fraud (threshold: 0.5)
                if fraud_score >= 0.5:
                    logger.info(f"    ⚠️  FRAUD DETECTED!")

                    # Store in database
                    fraud_post_id = await self._store_fraud_post(post, ai_result)

                    if fraud_post_id:
                        post["fraud_post_id"] = fraud_post_id
                        post["ai_analysis"] = ai_result
                        fraud_posts.append(post)

                        logger.info(f"    ✅ Saved to database (ID: {fraud_post_id})")
                else:
                    logger.debug(f"    ✓ Legitimate post, discarding")

                # Small delay between analyses
                await asyncio.sleep(0.5)

        except Exception as e:
            logger.error(f"Error in AI processing: {str(e)}")

        return fraud_posts

    async def _store_fraud_post(self, post: Dict, ai_result: Dict) -> int:
        """Store fraud post in database"""
        try:
            db = next(get_db())

            query = text("""
                INSERT INTO ai_scraped_posts (
                    platform, platform_id, group_id, group_name,
                    author_name, author_profile_url, author_profile_image,
                    content, media_urls, post_url, post_type,
                    timestamp, scraped_at,
                    is_fraudulent, fraud_confidence,
                    ai_analysis_result, fraud_reasons,
                    processed
                ) VALUES (
                    :platform, :platform_id, :group_id, :group_name,
                    :author_name, :author_profile_url, :author_profile_image,
                    :content, :media_urls, :post_url, :post_type,
                    :timestamp, :scraped_at,
                    :is_fraudulent, :fraud_confidence,
                    :ai_analysis_result, :fraud_reasons,
                    :processed
                ) RETURNING id
            """)

            result = db.execute(
                query,
                {
                    "platform": "facebook",
                    "platform_id": post.get("post_url", "").split("/")[-1]
                    if post.get("post_url")
                    else f"feed_{datetime.now().timestamp()}",
                    "group_id": "feed",
                    "group_name": "Facebook Feed",
                    "author_name": post.get("author_name"),
                    "author_profile_url": post.get("author_profile_url"),
                    "author_profile_image": post.get("author_profile_image"),
                    "content": post.get("content"),
                    "media_urls": post.get("images", []),
                    "post_url": post.get("post_url"),
                    "post_type": "feed",
                    "timestamp": datetime.now(),
                    "scraped_at": datetime.now(),
                    "is_fraudulent": True,
                    "fraud_confidence": ai_result.get("fraud_score", 0.0),
                    "ai_analysis_result": ai_result,
                    "fraud_reasons": ai_result.get("matched_keywords", []),
                    "processed": True,
                },
            )

            db.commit()

            post_id = result.fetchone()[0]
            return post_id

        except Exception as e:
            logger.error(f"Error storing fraud post: {str(e)}")
            db.rollback()
            return None


# CLI entry point for manual testing
async def main():
    """Run feed scraper from command line"""
    import sys

    # Facebook credentials (update these or pass as arguments)
    EMAIL = "christiano.developer05@gmail.com"
    PASSWORD = "gymjuK-zocdit-sichi7"

    if len(sys.argv) > 1:
        EMAIL = sys.argv[1]
    if len(sys.argv) > 2:
        PASSWORD = sys.argv[2]

    scraper = FacebookFeedScraper(
        email=EMAIL,
        password=PASSWORD,
        headless=False,  # Set True for production
        batch_size=10,
    )

    result = await scraper.scrape_feed(num_batches=3)

    print("\n" + "=" * 60)
    print("FINAL RESULTS")
    print("=" * 60)
    print(f"Total scraped: {result.get('total_scraped', 0)}")
    print(f"Fraud detected: {result.get('total_fraud_detected', 0)}")
    print(f"Fraud posts stored in database")
    print("=" * 60)


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.DEBUG, format="%(asctime)s | %(levelname)s | %(message)s"
    )
    asyncio.run(main())
