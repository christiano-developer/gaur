"""
Facebook Search Scraper V3 - Keyword Search with Screenshots
Searches Facebook with fraud keywords and captures screenshots of posts
"""
import asyncio
import logging
from typing import List, Dict
from datetime import datetime
from playwright.async_api import async_playwright, Page
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.ai.fraud_detector import FraudDetector
from app.ai.image_analyzer import ImageAnalyzer
from app.ai.vision_fraud_detector import VisionFraudDetector
from app.ai.gpt_vision_fraud_detector import GPTVisionFraudDetector
from app.ai.gpt_html_fraud_detector import GPTHTMLFraudDetector
from app.database import get_db
from sqlalchemy import text

logger = logging.getLogger(__name__)


class FacebookSearchScraper:
    """Facebook scraper that searches with keywords and captures screenshots"""

    def __init__(
        self,
        email: str,
        password: str,
        headless: bool = False,
        screenshots_dir: str = None,
        test_mode: bool = False
    ):
        self.email = email
        self.password = password
        self.headless = headless
        self.test_mode = test_mode
        self.playwright = None
        self.browser = None
        self.page = None
        # Use GPT-4 HTML detector (faster, cheaper, more accurate than screenshots!)
        self.html_detector = GPTHTMLFraudDetector()
        # Keep vision detector as fallback
        self.vision_detector = GPTVisionFraudDetector()
        # Keep old detectors for fallback
        self.fraud_detector = FraudDetector()
        self.image_analyzer = ImageAnalyzer()
        self.llama_vision_detector = VisionFraudDetector(model="llama3.2-vision")  # Backup

        # Setup screenshots directory
        if screenshots_dir:
            self.screenshots_dir = Path(screenshots_dir)
        else:
            self.screenshots_dir = Path(__file__).parent.parent.parent.parent / "data" / "images" / "facebook"

        self.screenshots_dir.mkdir(parents=True, exist_ok=True)

        # Setup test output directory
        self.test_output_dir = Path(__file__).parent.parent.parent.parent / "data" / "test_output"
        self.test_output_dir.mkdir(parents=True, exist_ok=True)

        if self.test_mode:
            logger.info("🧪 TEST MODE ENABLED - Will save extracted text to files instead of API calls")
            logger.info(f"Test output directory: {self.test_output_dir}")
        else:
            logger.info(f"Screenshots will be saved to: {self.screenshots_dir}")

    async def start(self):
        """Initialize browser and login"""
        logger.info("Starting Facebook search scraper...")

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

        # Fill email with human-like typing
        logger.info("Entering email (human-like typing)...")
        await self.page.click('input[name="email"]')
        await asyncio.sleep(0.3)
        await self._type_like_human(self.email, 'input[name="email"]')
        await asyncio.sleep(1)

        # Fill password with human-like typing
        logger.info("Entering password (human-like typing)...")
        await self.page.click('input[name="pass"]')
        await asyncio.sleep(0.3)
        await self._type_like_human(self.password, 'input[name="pass"]')
        await asyncio.sleep(1)

        # Click login
        logger.info("Clicking login button...")
        await self.page.click('button[name="login"]')

        # Wait for 2FA or security checks
        logger.info("Waiting for login to complete (15s for 2FA if needed)...")
        await asyncio.sleep(15)

        # Check if logged in
        login_indicators = [
            '[aria-label="Home"]',
            '[aria-label="Search Facebook"]',
            'input[aria-label="Search Facebook"]',
        ]

        logged_in = False
        for indicator in login_indicators:
            if await self.page.query_selector(indicator):
                logged_in = True
                logger.info(f"✅ Login successful! (Found: {indicator})")
                break

        if not logged_in:
            logger.warning("Login may have failed or requires manual intervention")
            # Take screenshot for debugging
            await self.page.screenshot(path='debug_login_failed.png')
            logger.info("Saved debug screenshot: debug_login_failed.png")

    async def _type_like_human(self, text: str, selector: str):
        """Type text with human-like delays between keystrokes"""
        import random

        # Clear the field first
        await self.page.fill(selector, '')

        # Type character by character
        for char in text:
            await self.page.type(selector, char)
            # Random delay between 50-150ms (human typing speed)
            delay = random.uniform(0.05, 0.15)
            await asyncio.sleep(delay)

    async def search_and_scrape(
        self,
        keywords: List[str],
        posts_per_keyword: int = 3
    ) -> List[Dict]:
        """
        Search Facebook with keywords and screenshot posts

        Args:
            keywords: List of search keywords
            posts_per_keyword: Number of posts to screenshot per keyword

        Returns:
            List of scraped post data with screenshots
        """
        all_posts = []

        for keyword_idx, keyword in enumerate(keywords, 1):
            logger.info(f"\n{'='*60}")
            logger.info(f"KEYWORD {keyword_idx}/{len(keywords)}: '{keyword}'")
            logger.info(f"{'='*60}")

            posts = await self._search_keyword(keyword, posts_per_keyword)
            all_posts.extend(posts)

            # Wait between keywords to avoid rate limiting
            if keyword_idx < len(keywords):
                wait_time = 3
                logger.info(f"Waiting {wait_time}s before next keyword...")
                await asyncio.sleep(wait_time)

        logger.info(f"\n{'='*60}")
        logger.info(f"SCRAPING COMPLETE")
        logger.info(f"Total posts captured: {len(all_posts)}")
        logger.info(f"{'='*60}")

        return all_posts

    async def _search_keyword(self, keyword: str, max_posts: int) -> List[Dict]:
        """Search Facebook with a specific keyword and capture screenshots"""
        try:
            # Go to Facebook home first
            logger.info("Navigating to Facebook home...")
            await self.page.goto('https://www.facebook.com/')
            await asyncio.sleep(2)

            # Find and click the search box
            logger.info(f"Searching for: '{keyword}'")
            search_selectors = [
                'input[aria-label="Search Facebook"]',
                'input[placeholder*="Search"]',
                'input[type="search"]',
            ]

            search_box = None
            for selector in search_selectors:
                search_box = await self.page.query_selector(selector)
                if search_box:
                    logger.info(f"Found search box: {selector}")
                    break

            if not search_box:
                logger.error("Could not find Facebook search box")
                return []

            # Click search box
            await search_box.click()
            await asyncio.sleep(0.5)

            # Type keyword with human-like typing
            logger.info("Typing search keyword (human-like)...")
            await self._type_like_human(keyword, search_selectors[0])
            await asyncio.sleep(1)

            # Press Enter to search
            logger.info("Pressing Enter to search...")
            await self.page.keyboard.press('Enter')
            await asyncio.sleep(3)

            # CRITICAL: Click "Posts" tab to skip Groups/Pages results
            logger.info("Waiting for Posts tab to appear...")
            await asyncio.sleep(2)  # Give time for tabs to load

            posts_tab_clicked = False
            try:
                # Try multiple selectors for the Posts tab
                posts_tab_selectors = [
                    'a[href*="/search/posts/"]',
                    'a:has-text("Posts")',
                    '[role="tab"]:has-text("Posts")',
                    'span:has-text("Posts")',
                ]

                for selector in posts_tab_selectors:
                    try:
                        # Wait for the element to be visible
                        await self.page.wait_for_selector(selector, timeout=3000, state='visible')
                        posts_tab = await self.page.query_selector(selector)
                        if posts_tab:
                            logger.info(f"✅ Found Posts tab: {selector}")
                            await posts_tab.click()
                            await asyncio.sleep(3)  # Wait for posts to load
                            posts_tab_clicked = True
                            break
                    except Exception as tab_error:
                        logger.debug(f"Selector '{selector}' not found: {str(tab_error)}")
                        continue

                if not posts_tab_clicked:
                    logger.warning("⚠️  Could not find Posts tab - may get Groups/Pages instead of posts")
            except Exception as e:
                logger.warning(f"Error clicking Posts tab: {str(e)}")

            # Wait for posts to load
            logger.info("Waiting for search results to load...")
            await asyncio.sleep(3)

            # CRITICAL: Scroll PAST the Groups/Pages section to reach actual posts
            logger.info("Scrolling past Groups/Pages section...")

            # Initial HUGE scroll to skip Groups/Pages (they appear first ~3000px)
            await self.page.evaluate("window.scrollBy(0, 3000)")
            await asyncio.sleep(2)

            # Continue scrolling aggressively to load actual posts
            logger.info("Scrolling to load actual posts...")
            for i in range(12):  # Even more scrolls to get to real posts
                await self.page.evaluate("window.scrollBy(0, 1200)")
                await asyncio.sleep(1)
                logger.debug(f"  Scroll {i+1}/12")

            # Now find post elements (should be actual posts after scrolling past Groups)
            logger.info("Finding post elements...")
            post_elements = await self.page.query_selector_all('div[role="article"]')

            logger.info(f"Found {len(post_elements)} post elements after scrolling")

            posts = []
            screenshot_count = 0
            ads_skipped = 0
            fraud_count = 0
            legitimate_count = 0

            for idx, post_element in enumerate(post_elements[:max_posts * 3]):  # Check more than needed (ads take up slots)
                try:
                    # Skip if we have enough posts
                    if screenshot_count >= max_posts:
                        break

                    # CRITICAL: Check if this is a sponsored/ad post
                    is_sponsored = await self._is_sponsored_post(post_element)
                    if is_sponsored:
                        ads_skipped += 1
                        logger.debug(f"  Post {idx + 1}: SKIPPED - Sponsored ad detected")
                        continue

                    # Extract HTML from post element (PRIMARY METHOD)
                    logger.debug(f"  Post {idx + 1}: Extracting HTML...")
                    html = await post_element.inner_html()

                    if not html or len(html) < 100:
                        logger.warning(f"  Post {idx + 1}: HTML too short ({len(html)} chars), skipping")
                        continue

                    # Extract clean text (removes scripts, styles, SVGs - saves tokens!)
                    logger.info(f"  📄 Post {idx + 1}: Raw HTML: {len(html):,} chars")
                    clean_text = self._extract_text_from_html(html)
                    logger.info(f"  ✨ Post {idx + 1}: Clean text: {len(clean_text):,} chars (saved {len(html) - len(clean_text):,} chars)")

                    # Show preview to help identify if this is Groups or actual post
                    text_preview = clean_text[:200].replace('\n', ' ')
                    logger.info(f"  👀 Preview: {text_preview}...")

                    if not clean_text or len(clean_text) < 50:
                        logger.warning(f"  Post {idx + 1}: Clean text too short ({len(clean_text)} chars), skipping")
                        continue

                    # TEST MODE: Save to file instead of API call
                    if self.test_mode:
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        keyword_safe = keyword.replace(' ', '_').replace('/', '_')[:30]

                        # Save clean text only (raw HTML is too big)
                        text_filename = f"post_{keyword_safe}_{timestamp}_{idx}.txt"
                        text_path = self.test_output_dir / text_filename
                        with open(text_path, 'w', encoding='utf-8') as f:
                            f.write(f"KEYWORD: {keyword}\n")
                            f.write(f"POST INDEX: {idx}\n")
                            f.write(f"RAW HTML LENGTH: {len(html):,} chars\n")
                            f.write(f"CLEAN TEXT LENGTH: {len(clean_text):,} chars\n")
                            f.write(f"TOKEN SAVINGS: {len(html) - len(clean_text):,} chars ({((len(html) - len(clean_text)) / len(html) * 100):.1f}%)\n")
                            f.write("="*80 + "\n")
                            f.write("CLEAN TEXT CONTENT (sent to API):\n")
                            f.write("="*80 + "\n")
                            f.write(clean_text)

                        logger.info(f"  💾 SAVED: {text_filename}")

                        screenshot_count += 1

                        # Skip API call and database storage in test mode
                        continue

                    # PRODUCTION MODE: Analyze clean text with GPT-4 text API
                    logger.info(f"  🤖 Analyzing text with GPT-4 text API (1-2s)...")
                    fraud_result = await self.html_detector.analyze_post_html(clean_text)

                    # Check if we got meaningful content
                    if not fraud_result['content'] or len(fraud_result['content']) < 20:
                        logger.warning(f"  Post {idx + 1}: Insufficient content extracted ({len(fraud_result.get('content', ''))} chars), skipping")
                        continue

                    logger.info(f"  📝 HTML AI: {len(fraud_result['content'])} chars, user={fraud_result['username']}, lang={fraud_result['language']}")

                    # Generate screenshot filename for storage
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    keyword_safe = keyword.replace(' ', '_').replace('/', '_')[:30]
                    screenshot_filename = f"fb_search_{keyword_safe}_{timestamp}_{idx}.png"
                    screenshot_path = self.screenshots_dir / screenshot_filename

                    # OPTIONAL: Take screenshot for evidence (only if fraud detected)
                    # Commenting out for now - will add back if needed
                    # if fraud_result['fraud_score'] >= 0.5:
                    #     logger.debug(f"  Post {idx + 1}: Taking screenshot for evidence...")
                    #     await post_element.scroll_into_view_if_needed()
                    #     await asyncio.sleep(1)
                    #     await post_element.screenshot(path=str(screenshot_path))
                    #     logger.info(f"  📸 Screenshot saved - {screenshot_filename}")

                    # Build post data from HTML AI analysis
                    post_data = {
                        'keyword': keyword,
                        'screenshot_path': str(screenshot_path) if fraud_result['fraud_score'] >= 0.5 else None,
                        'screenshot_filename': screenshot_filename if fraud_result['fraud_score'] >= 0.5 else None,
                        'username': fraud_result['username'],
                        'content': fraud_result['content'],
                        'language': fraud_result['language'],
                        'fraud_score': fraud_result['fraud_score'],
                        'risk_level': fraud_result['risk_level'],
                        'fraud_type': fraud_result['fraud_type'],
                        'matched_keywords': fraud_result['matched_keywords'],
                        'red_flags': fraud_result['red_flags'],
                        'reasoning': fraud_result['reasoning'],
                        'timestamp': datetime.now().isoformat(),
                    }

                    posts.append(post_data)
                    screenshot_count += 1

                    logger.info(f"  🎯 Fraud Score: {fraud_result['fraud_score']:.3f} ({fraud_result['risk_level']}) - {fraud_result['fraud_type']}")

                    # ONLY store fraud posts (fraud_score >= 0.5)
                    if fraud_result['fraud_score'] >= 0.5:
                        fraud_count += 1
                        logger.info(f"  🚨 FRAUD DETECTED - Storing post and creating alert")

                        # Store in database
                        await self._store_post(post_data)

                        # Create fraud alert
                        await self._create_fraud_alert(post_data, fraud_result)
                    else:
                        legitimate_count += 1
                        logger.info(f"  ✅ Legitimate post - Not storing (HTML-only, no screenshot)")

                except Exception as e:
                    logger.error(f"Error processing post {idx}: {str(e)}")
                    continue

            logger.info(f"\n📊 Keyword '{keyword}' Summary:")
            logger.info(f"   Posts analyzed: {screenshot_count}")
            logger.info(f"   🚨 Fraud detected: {fraud_count} (saved)")
            logger.info(f"   ✅ Legitimate: {legitimate_count} (deleted)")
            logger.info(f"   📢 Ads skipped: {ads_skipped}")
            logger.info(f"   Total checked: {min(idx + 1, len(post_elements))}")
            return posts

        except Exception as e:
            logger.error(f"Error searching keyword '{keyword}': {str(e)}")
            import traceback
            logger.debug(traceback.format_exc())
            return []

    def _extract_text_from_html(self, html: str) -> str:
        """
        Extract only visible text from HTML, remove scripts/styles
        Drastically reduces token usage
        """
        try:
            from bs4 import BeautifulSoup

            # Parse HTML
            soup = BeautifulSoup(html, 'html.parser')

            # Remove script tags
            for script in soup.find_all('script'):
                script.decompose()

            # Remove style tags
            for style in soup.find_all('style'):
                style.decompose()

            # Remove SVG (icons, not useful)
            for svg in soup.find_all('svg'):
                svg.decompose()

            # Get visible text
            text = soup.get_text(separator=' ', strip=True)

            # Clean up whitespace
            import re
            text = re.sub(r'\s+', ' ', text)

            return text.strip()

        except Exception as e:
            logger.warning(f"Error extracting text from HTML: {str(e)}")
            # Fallback: return raw HTML (will be truncated by GPT detector)
            return html

    async def _is_sponsored_post(self, post_element) -> bool:
        """
        Check if a post is sponsored/ad
        Returns True if sponsored, False if organic
        """
        try:
            # Get post HTML
            html = await post_element.inner_html()

            # Method 1: Look for "Sponsored" text
            if 'Sponsored' in html or 'sponsored' in html:
                return True

            # Method 2: Look for ad-related attributes
            ad_indicators = [
                'data-ad-rendering-role',
                'data-ad-comet-preview',
                'attributionsrc',
                'ad_id',
            ]

            for indicator in ad_indicators:
                if indicator in html:
                    return True

            # Method 3: Look for "Sponsored" text element
            try:
                sponsored_elem = await post_element.query_selector('text="Sponsored"')
                if sponsored_elem:
                    return True
            except:
                pass

            # Method 4: Check for specific ad class patterns
            class_attr = await post_element.get_attribute('class')
            if class_attr and 'ad' in class_attr.lower():
                return True

            return False

        except Exception as e:
            logger.debug(f"Error checking if sponsored: {str(e)}")
            return False  # Assume organic if we can't tell

    async def _store_post(self, post_data: Dict):
        """Store scraped post in database"""
        try:
            db = next(get_db())

            query = text("""
                INSERT INTO ai_scraped_posts (
                    platform, platform_id, group_id, group_name,
                    author_name, content, media_urls,
                    timestamp, scraped_at, processed,
                    ai_analysis_result, fraud_confidence, is_fraudulent
                ) VALUES (
                    :platform, :platform_id, :group_id, :group_name,
                    :author_name, :content, :media_urls,
                    :timestamp, :scraped_at, :processed,
                    :ai_analysis_result, :fraud_confidence, :is_fraudulent
                )
                RETURNING id
            """)

            import json
            # Execute synchronously (get_db returns sync session)
            result = db.execute(
                query,
                {
                    'platform': 'facebook_search',
                    'platform_id': post_data.get('screenshot_filename') or f"html_{post_data['timestamp']}",
                    'group_id': f"search_{post_data['keyword']}",
                    'group_name': f"Search: {post_data['keyword']}",
                    'author_name': post_data['username'],
                    'content': post_data['content'],
                    'media_urls': json.dumps([post_data['screenshot_path']]) if post_data.get('screenshot_path') else json.dumps([]),
                    'timestamp': post_data['timestamp'],
                    'scraped_at': post_data['timestamp'],
                    'processed': True,
                    'ai_analysis_result': json.dumps({
                        'fraud_score': post_data['fraud_score'],
                        'risk_level': post_data['risk_level'],
                        'fraud_type': post_data['fraud_type'],
                        'matched_keywords': post_data['matched_keywords'],
                        'red_flags': post_data['red_flags'],
                        'reasoning': post_data['reasoning'],
                        'language': post_data['language'],
                        'analysis_method': 'html_ai'
                    }),
                    'fraud_confidence': post_data['fraud_score'],
                    'is_fraudulent': post_data['fraud_score'] >= 0.5
                }
            )

            db.commit()  # Sync commit
            post_id = result.fetchone()[0]
            logger.info(f"  💾 Stored in DB: post_id={post_id}")

        except Exception as e:
            logger.error(f"Error storing post: {str(e)}")
            import traceback
            logger.debug(traceback.format_exc())

    async def _create_fraud_alert(self, post_data: Dict, fraud_result: Dict):
        """Create fraud alert in database"""
        try:
            db = next(get_db())

            query = text("""
                INSERT INTO ai_fraud_alerts (
                    source_platform, source_id, content_text,
                    confidence_score, risk_level, fraud_type,
                    detected_keywords, ai_metadata, status
                ) VALUES (
                    :source_platform, :source_id, :content_text,
                    :confidence_score, :risk_level, :fraud_type,
                    :detected_keywords, :ai_metadata, :status
                )
                RETURNING id
            """)

            import json
            # Execute synchronously
            result = db.execute(
                query,
                {
                    'source_platform': 'facebook_search',
                    'source_id': post_data.get('screenshot_filename') or f"html_{post_data['timestamp']}",
                    'content_text': post_data['content'],
                    'confidence_score': fraud_result['fraud_score'],
                    'risk_level': fraud_result['risk_level'],
                    'fraud_type': fraud_result['fraud_type'],
                    'detected_keywords': json.dumps(fraud_result['matched_keywords']),
                    'ai_metadata': json.dumps({
                        'keyword_searched': post_data['keyword'],
                        'username': post_data['username'],
                        'screenshot_path': post_data.get('screenshot_path'),
                        'language': post_data['language'],
                        'red_flags': post_data['red_flags'],
                        'reasoning': post_data['reasoning'],
                        'analysis_method': 'html_ai'
                    }),
                    'status': 'open'
                }
            )

            db.commit()  # Sync commit
            alert_id = result.fetchone()[0]
            logger.info(f"  🚨 FRAUD ALERT CREATED: alert_id={alert_id}")

        except Exception as e:
            logger.error(f"Error creating fraud alert: {str(e)}")

    async def stop(self):
        """Close browser"""
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        logger.info("Browser closed")


async def main():
    """Test the search scraper"""
    EMAIL = "christiano.developer05@gmail.com"
    PASSWORD = "gymjuK-zocdit-sichi7"

    # Test keywords (3 keywords, 3 posts each = 9 total)
    TEST_KEYWORDS = [
        "cheap hotel goa",
        "advance payment upi",
        "guaranteed returns"
    ]

    # Enable test mode to save extracted text to files
    TEST_MODE = False  # Set to True for testing (saves files, no API calls)

    scraper = FacebookSearchScraper(EMAIL, PASSWORD, headless=False, test_mode=TEST_MODE)

    try:
        await scraper.start()
        posts = await scraper.search_and_scrape(
            keywords=TEST_KEYWORDS,
            posts_per_keyword=3
        )

        print("\n" + "=" * 60)
        print("FINAL RESULTS")
        print("=" * 60)

        if TEST_MODE:
            print(f"🧪 TEST MODE - Files saved to: {scraper.test_output_dir}")
            print(f"Total posts extracted: {len(posts)}")
            print("\nCheck the *.txt files to review clean text that would be sent to API")
        else:
            print(f"Total posts analyzed: {len(posts)}")

            fraud_posts = [p for p in posts if p['fraud_score'] >= 0.5]
            legitimate_posts = [p for p in posts if p['fraud_score'] < 0.5]

            print(f"🚨 Fraud detected & saved: {len(fraud_posts)}")
            print(f"✅ Legitimate (deleted): {len(legitimate_posts)}")
            print(f"\n💾 Database entries created: {len(fraud_posts)}")
            print(f"🗑️  Screenshots deleted: {len(legitimate_posts)}")
        print("=" * 60)

    finally:
        await scraper.stop()


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s"
    )
    asyncio.run(main())
