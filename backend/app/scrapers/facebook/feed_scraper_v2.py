"""
Facebook Feed Scraper V2 - Organic Posts Only
Filters out sponsored content and extracts real user posts
"""
import asyncio
import logging
from typing import List, Dict
from datetime import datetime
from playwright.async_api import async_playwright, Page
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.ai.fraud_detector import FraudDetector
from app.database import get_db
from app.scrapers.facebook.llm_extractor import LLMExtractor

logger = logging.getLogger(__name__)


class FacebookFeedScraperV2:
    """Facebook feed scraper that extracts ORGANIC posts only (no ads)"""

    def __init__(self, email: str, password: str, headless: bool = False):
        self.email = email
        self.password = password
        self.headless = headless
        self.playwright = None
        self.browser = None
        self.page = None
        self.llm_extractor = LLMExtractor(model="llama3.2:3b")

    async def start(self):
        """Initialize browser and login"""
        logger.info("Starting Facebook scraper V2 (organic posts only)...")

        self.playwright = await async_playwright().start()

        # Use Firefox (better macOS compatibility)
        self.browser = await self.playwright.firefox.launch(
            headless=self.headless,
            firefox_user_prefs={
                'dom.webdriver.enabled': False,
                'useAutomationExtension': False,
            }
        )

        self.page = await self.browser.new_page()
        logger.info("Browser initialized")

        # Login to Facebook
        await self._login()

    async def _login(self):
        """Login to Facebook"""
        logger.info("Navigating to Facebook...")
        await self.page.goto('https://www.facebook.com/')
        await asyncio.sleep(2)

        # Fill email
        logger.info("Entering email...")
        await self.page.fill('input[name="email"]', self.email)
        await asyncio.sleep(1)

        # Fill password
        logger.info("Entering password...")
        await self.page.fill('input[name="pass"]', self.password)
        await asyncio.sleep(1)

        # Click login
        logger.info("Clicking login button...")
        await self.page.click('button[name="login"]')
        await asyncio.sleep(5)

        # Check if logged in
        login_indicators = [
            '[aria-label="Home"]',
            '[aria-label="Create new post"]',
        ]

        logged_in = False
        for indicator in login_indicators:
            if await self.page.query_selector(indicator):
                logged_in = True
                logger.info(f"✅ Login successful! (Found: {indicator})")
                break

        if not logged_in:
            logger.warning("Login may have failed, but continuing...")

    async def scrape_feed(self, num_posts: int = 20):
        """
        Scrape organic posts from Facebook feed

        Args:
            num_posts: Number of posts to scrape
        """
        logger.info(f"Starting feed scraping: target {num_posts} organic posts")

        # Wait for initial page load
        logger.info("Waiting for feed to start loading...")
        await asyncio.sleep(10)

        # Scroll to trigger lazy loading
        logger.info("Scrolling to load posts...")
        for i in range(3):
            await self.page.evaluate("window.scrollBy(0, 600)")
            await asyncio.sleep(2)

        # Wait for loading placeholders to disappear
        logger.info("Waiting for loading placeholders to be replaced with real posts...")
        max_wait = 30  # Wait up to 30 seconds
        wait_interval = 2

        for attempt in range(max_wait // wait_interval):
            # Check if we have any non-loading articles
            all_articles = await self.page.query_selector_all('div[role="article"]')
            loading_count = 0

            for article in all_articles[:5]:  # Check first 5
                html = await article.inner_html()
                if 'aria-label="Loading..."' in html or 'data-visualcompletion="loading-state"' in html:
                    loading_count += 1

            logger.info(f"  Attempt {attempt + 1}: {len(all_articles)} articles, {loading_count} still loading...")

            if loading_count == 0 and len(all_articles) > 0:
                logger.info("✅ Posts loaded!")
                break

            await asyncio.sleep(wait_interval)
        else:
            logger.warning("Timeout waiting for posts to load, proceeding anyway...")

        # Save screenshot
        await self.page.screenshot(path='debug_facebook_feed_v2.png')
        logger.info("📸 Screenshot saved: debug_facebook_feed_v2.png")

        # Get all article elements (refresh after waiting)
        all_articles = await self.page.query_selector_all('div[role="article"]')
        logger.info(f"Found {len(all_articles)} article elements total")

        organic_posts = []
        sponsored_count = 0

        for idx, article in enumerate(all_articles):
            try:
                # Get raw HTML from article
                html = await article.inner_html()

                if not html or len(html) < 100:
                    logger.debug(f"  Post {idx + 1}: HTML too short ({len(html)} chars)")
                    continue

                logger.info(f"  Post {idx + 1}: Extracting with LLM ({len(html)} chars of HTML)...")

                # DEBUG: Show first 500 chars of HTML
                logger.debug(f"  HTML preview: {html[:500]}")

                # Use LLM to extract structured data
                llm_result = await self.llm_extractor.extract_post_data(html)

                if not llm_result:
                    logger.warning(f"  Post {idx + 1}: LLM extraction failed")
                    continue

                # Check if sponsored
                if llm_result.get('is_sponsored'):
                    sponsored_count += 1
                    logger.debug(f"  Post {idx + 1}: SKIPPED (Sponsored ad detected by LLM)")
                    continue

                # Build post data from LLM result
                post_data = {
                    'author': llm_result.get('author'),
                    'content': llm_result.get('content'),
                    'images': [],  # LLM just tells us if image exists
                    'timestamp': datetime.now().isoformat(),
                }

                if post_data.get('content'):
                    organic_posts.append(post_data)
                    author = post_data['author'] or 'Unknown'
                    logger.info(f"  ✅ Post {idx + 1}: {author[:30]} - {post_data['content'][:50]}...")

                    # Stop when we have enough
                    if len(organic_posts) >= num_posts:
                        break
                else:
                    logger.debug(f"  Post {idx + 1}: No content extracted by LLM")

            except Exception as e:
                logger.error(f"Error processing article {idx}: {str(e)}")

        logger.info(f"\n{'=' * 60}")
        logger.info(f"SCRAPING SUMMARY")
        logger.info(f"Total articles found: {len(all_articles)}")
        logger.info(f"Sponsored ads skipped: {sponsored_count}")
        logger.info(f"Organic posts extracted: {len(organic_posts)}")
        logger.info(f"{'=' * 60}\n")

        # Now process with AI
        if organic_posts:
            fraud_posts = await self._process_with_ai(organic_posts)
            logger.info(f"🎯 Fraud detected in {len(fraud_posts)} posts")

        return organic_posts

    async def _is_sponsored_post(self, article) -> bool:
        """
        Check if a post is sponsored (ad)

        Returns:
            True if sponsored, False if organic
        """
        try:
            # Method 1: Look for "Sponsored" text
            sponsored_text = await article.query_selector('text="Sponsored"')
            if sponsored_text:
                return True

            # Method 2: Look for data-ad attributes
            html = await article.inner_html()
            if 'data-ad-rendering-role' in html or 'Sponsored' in html:
                return True

            # Method 3: Look for attributionsrc (ad tracking)
            if 'attributionsrc=' in html:
                return True

            return False

        except Exception as e:
            logger.debug(f"Error checking if sponsored: {str(e)}")
            return False  # Assume organic if we can't tell

    async def _extract_organic_post(self, article) -> Dict:
        """
        Extract data from an organic (non-ad) post

        Returns:
            Dict with post data or None
        """
        try:
            data = {
                'author': None,
                'content': None,
                'images': [],
                'timestamp': datetime.now().isoformat(),
            }

            # METHOD 1: Try inner_text()
            try:
                all_text = await article.inner_text()
                logger.debug(f"    inner_text: {len(all_text) if all_text else 0} chars")
            except:
                all_text = None

            # METHOD 2: If inner_text fails, try text_content()
            if not all_text:
                try:
                    all_text = await article.text_content()
                    logger.debug(f"    text_content: {len(all_text) if all_text else 0} chars")
                except:
                    all_text = None

            # METHOD 3: If both fail, try getting text from all span/div elements
            if not all_text or len(all_text) < 20:
                try:
                    # Get all text-containing elements
                    text_elements = await article.query_selector_all('span, div, p, h1, h2, h3, h4')
                    text_pieces = []

                    for elem in text_elements[:50]:  # Check first 50 elements
                        try:
                            text = await elem.text_content()
                            if text and len(text.strip()) > 5:
                                text_pieces.append(text.strip())
                        except:
                            pass

                    if text_pieces:
                        all_text = '\n'.join(text_pieces)
                        logger.debug(f"    manual extraction: {len(all_text)} chars from {len(text_pieces)} elements")
                except Exception as e:
                    logger.debug(f"    manual extraction failed: {str(e)}")

            if not all_text or len(all_text) < 20:
                logger.debug("    ❌ No text content found")
                return None

            # Split into lines
            lines = [line.strip() for line in all_text.split('\n') if line.strip()]
            logger.debug(f"    Found {len(lines)} lines of text")

            # Filter out UI elements
            skip_words = [
                'like', 'comment', 'share', 'sponsored', 'see more',
                'see less', 'follow', 'top fan', 'public', 'friends',
                'just now', 'yesterday', 'reactions:', 'comments',
                'learn more', 'create for free'
            ]

            content_lines = []
            author_found = False

            for line in lines:
                line_lower = line.lower()

                # Skip very short lines
                if len(line) < 3:
                    continue

                # First non-UI line is usually the author
                if not author_found and len(line) > 2 and len(line) < 100:
                    if not any(skip in line_lower for skip in skip_words):
                        data['author'] = line
                        author_found = True
                        logger.debug(f"    Author: {line}")
                        continue

                # Collect content lines
                if len(line) > 10:
                    if not any(skip in line_lower for skip in skip_words):
                        content_lines.append(line)

            # Join content
            if content_lines:
                data['content'] = ' '.join(content_lines[:5])  # First 5 lines
                logger.debug(f"    Content: {data['content'][:100]}...")

            # Extract images (scontent URLs)
            try:
                img_elements = await article.query_selector_all('img[src*="scontent"]')
                for img in img_elements[:3]:  # Max 3 images
                    src = await img.get_attribute('src')
                    if src and 'scontent' in src:
                        data['images'].append(src)
                        logger.debug(f"    Image: {src[:80]}...")
            except:
                pass

            return data if data['content'] else None

        except Exception as e:
            logger.error(f"Error extracting organic post: {str(e)}")
            import traceback
            logger.debug(traceback.format_exc())
            return None

    async def _process_with_ai(self, posts: List[Dict]) -> List[Dict]:
        """Process posts with AI fraud detection"""
        logger.info(f"🤖 Analyzing {len(posts)} posts with AI...")

        detector = FraudDetector({'use_gpu': False})
        fraud_posts = []

        for idx, post in enumerate(posts):
            try:
                content = post.get('content', '')

                # AI Analysis
                ai_result = await detector.analyze_text(content)

                fraud_score = ai_result.get("fraud_score", 0.0)
                risk_level = ai_result.get("risk_level", "LOW")

                if fraud_score >= 0.5:
                    logger.info(f"  ⚠️  Post {idx + 1}: FRAUD ({fraud_score:.2f}) - {risk_level}")
                    post['fraud_score'] = fraud_score
                    post['risk_level'] = risk_level
                    post['fraud_type'] = ai_result.get('fraud_type', 'unknown')
                    fraud_posts.append(post)

                    # Store in database
                    await self._store_fraud_post(post, ai_result)
                else:
                    logger.debug(f"  ✓ Post {idx + 1}: Legitimate ({fraud_score:.2f})")

            except Exception as e:
                logger.error(f"Error analyzing post {idx}: {str(e)}")

        return fraud_posts

    async def _store_fraud_post(self, post: Dict, ai_result: Dict):
        """Store fraud post in database"""
        try:
            db = next(get_db())

            query = """
            INSERT INTO ai_scraped_posts (
                platform, content, author_name, media_urls,
                fraud_confidence, is_fraudulent, ai_analysis_result
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
            """

            import json
            result = await db.fetch_one(
                query,
                'facebook',
                post.get('content'),
                post.get('author'),
                json.dumps(post.get('images', [])),
                post.get('fraud_score', 0.0),
                True,
                json.dumps(ai_result)
            )

            logger.info(f"  💾 Stored fraud post: ID {result['id']}")
            return result['id']

        except Exception as e:
            logger.error(f"Error storing fraud post: {str(e)}")
            return None

    async def stop(self):
        """Close browser"""
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        logger.info("Browser closed")


async def main():
    """Test the scraper"""
    # NOTE: This scraper is experimental. Use feed_scraper.py for production.
    from app.config import settings

    EMAIL = settings.FB_EMAIL
    PASSWORD = settings.FB_PASSWORD

    if not EMAIL or not PASSWORD:
        print("Error: FB_EMAIL and FB_PASSWORD must be set in your .env file.")
        print("Please copy backend/.env.example to backend/.env and fill in your credentials.")
        return

    scraper = FacebookFeedScraperV2(EMAIL, PASSWORD, headless=settings.FB_HEADLESS)

    try:
        await scraper.start()
        posts = await scraper.scrape_feed(num_posts=10)

        print("\n" + "=" * 60)
        print("FINAL RESULTS")
        print("=" * 60)
        print(f"Total organic posts extracted: {len(posts)}")
        print("=" * 60)

    finally:
        await scraper.stop()


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(asctime)s | %(levelname)s | %(message)s"
    )
    asyncio.run(main())
