"""
Facebook Base Scraper with Humanization & Stealth Features
Provides common functionality for all Facebook scrapers
"""

import asyncio
import random
import time
from typing import Dict, List, Optional
from datetime import datetime
from playwright.async_api import async_playwright, Browser, Page, BrowserContext
import logging

logger = logging.getLogger(__name__)


class FacebookBaseScraper:
    """
    Base class for Facebook scraping with humanization and stealth features
    """

    def __init__(self, email: str, password: str, headless: bool = False):
        self.email = email
        self.password = password
        self.headless = headless
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.playwright = None

        # Human-like timing parameters
        self.min_delay = 2  # Minimum delay between actions (seconds)
        self.max_delay = 5  # Maximum delay between actions (seconds)
        self.typing_delay_min = 50  # Min typing delay (ms)
        self.typing_delay_max = 150  # Max typing delay (ms)
        self.scroll_delay_min = 1  # Min scroll pause (seconds)
        self.scroll_delay_max = 3  # Max scroll pause (seconds)

    async def start(self):
        """Initialize browser with stealth settings"""
        try:
            logger.info("Starting Facebook scraper...")

            self.playwright = await async_playwright().start()

            # Launch browser with stealth args
            # Using Firefox instead of Chromium (better for macOS)
            self.browser = await self.playwright.firefox.launch(
                headless=self.headless,
                firefox_user_prefs={
                    'dom.webdriver.enabled': False,
                    'useAutomationExtension': False,
                }
            )

            # Create context with realistic user agent and viewport
            self.context = await self.browser.new_context(
                user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                viewport={'width': 1920, 'height': 1080},
                locale='en-US',
                timezone_id='Asia/Kolkata',
                geolocation={'latitude': 15.2993, 'longitude': 74.1240},  # Goa, India
                permissions=['geolocation'],
            )

            # Remove webdriver flags
            await self.context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => false
                });

                // Mock plugins
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5]
                });

                // Mock languages
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['en-US', 'en']
                });
            """)

            self.page = await self.context.new_page()

            # Set extra headers
            await self.page.set_extra_http_headers({
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            })

            logger.info("Browser initialized with stealth settings")

        except Exception as e:
            logger.error(f"Error starting browser: {str(e)}")
            await self.stop()
            raise

    async def stop(self):
        """Close browser and cleanup"""
        try:
            if self.page:
                try:
                    await self.page.close()
                except:
                    pass
            if self.context:
                try:
                    await self.context.close()
                except:
                    pass
            if self.browser:
                try:
                    await self.browser.close()
                except:
                    pass
            if self.playwright:
                try:
                    await self.playwright.stop()
                except:
                    pass
            logger.info("Browser closed")
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")

    async def human_delay(self, min_sec: Optional[float] = None, max_sec: Optional[float] = None):
        """Random delay to mimic human behavior"""
        min_delay = min_sec or self.min_delay
        max_delay = max_sec or self.max_delay
        delay = random.uniform(min_delay, max_delay)
        logger.debug(f"Human delay: {delay:.2f}s")
        await asyncio.sleep(delay)

    async def human_type(self, selector: str, text: str):
        """Type text with human-like delays"""
        element = await self.page.wait_for_selector(selector, timeout=10000)
        await element.click()
        await self.human_delay(0.5, 1.0)

        for char in text:
            await element.type(char, delay=random.randint(self.typing_delay_min, self.typing_delay_max))

    async def human_scroll(self, distance: int = 1000, num_scrolls: int = 3):
        """Scroll page with human-like pauses"""
        for i in range(num_scrolls):
            # Random scroll distance variation
            scroll_dist = distance + random.randint(-100, 100)

            await self.page.evaluate(f"window.scrollBy(0, {scroll_dist})")
            logger.debug(f"Scroll {i+1}/{num_scrolls}: {scroll_dist}px")

            # Random pause between scrolls
            await self.human_delay(self.scroll_delay_min, self.scroll_delay_max)

    async def random_mouse_movement(self):
        """Simulate random mouse movements"""
        for _ in range(random.randint(2, 4)):
            x = random.randint(100, 1800)
            y = random.randint(100, 1000)
            await self.page.mouse.move(x, y)
            await asyncio.sleep(random.uniform(0.1, 0.3))

    async def login_facebook(self) -> bool:
        """Login to Facebook with human-like behavior"""
        try:
            logger.info("Navigating to Facebook...")
            await self.page.goto('https://www.facebook.com/', wait_until='networkidle', timeout=30000)
            await self.human_delay(2, 3)

            # Check if already logged in
            if await self.page.query_selector('[aria-label="Create new post"]'):
                logger.info("Already logged in!")
                return True

            # Random mouse movements before login
            await self.random_mouse_movement()

            # Enter email
            logger.info("Entering email...")
            await self.human_type('input[name="email"]', self.email)
            await self.human_delay(0.5, 1.5)

            # Enter password
            logger.info("Entering password...")
            await self.human_type('input[name="pass"]', self.password)
            await self.human_delay(1, 2)

            # Click login button
            logger.info("Clicking login button...")
            login_button = await self.page.query_selector('button[name="login"]')
            await login_button.click()

            # Wait for navigation
            await self.page.wait_for_load_state('networkidle', timeout=30000)
            await self.human_delay(3, 5)

            # Check for 2FA
            if await self.page.query_selector('text=Two-factor authentication') or \
               await self.page.query_selector('text=Two-Factor Authentication') or \
               await self.page.query_selector('[name="approvals_code"]'):
                logger.warning("⚠️  2FA REQUIRED - Please approve on your device")
                logger.warning("Waiting 60 seconds for manual approval...")
                await asyncio.sleep(60)
                await self.page.wait_for_load_state('networkidle', timeout=30000)

            # Check current URL to verify login
            current_url = self.page.url
            logger.info(f"Current URL after login: {current_url}")

            # Multiple checks for successful login
            login_indicators = [
                '[aria-label="Create new post"]',
                '[aria-label="Home"]',
                '[role="navigation"]',
                'a[href="/"]',
                '[data-pagelet="root"]',
            ]

            logged_in = False
            for indicator in login_indicators:
                if await self.page.query_selector(indicator):
                    logger.info(f"✅ Login verified with: {indicator}")
                    logged_in = True
                    break

            if not logged_in:
                # Try waiting a bit more and check again
                logger.warning("Initial login check failed, waiting 5 more seconds...")
                await asyncio.sleep(5)

                for indicator in login_indicators:
                    if await self.page.query_selector(indicator):
                        logger.info(f"✅ Login verified (delayed) with: {indicator}")
                        logged_in = True
                        break

            if logged_in:
                logger.info("✅ Login successful!")
                await self.human_delay(2, 3)
                return True
            else:
                logger.error("❌ Login failed - feed not detected")
                logger.error("Taking screenshot for debugging...")
                await self.page.screenshot(path='login_failed.png')
                logger.error("Screenshot saved: login_failed.png")
                return False

        except Exception as e:
            logger.error(f"Login error: {str(e)}")
            return False

    async def save_screenshot(self, name: str):
        """Save screenshot for debugging"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"screenshots/{name}_{timestamp}.png"
        await self.page.screenshot(path=filename)
        logger.info(f"Screenshot saved: {filename}")

    async def download_image(self, image_url: str) -> Optional[bytes]:
        """Download image from URL"""
        try:
            response = await self.page.request.get(image_url)
            if response.ok:
                return await response.body()
            return None
        except Exception as e:
            logger.error(f"Error downloading image: {str(e)}")
            return None

    async def extract_post_data(self, post_element) -> Optional[Dict]:
        """
        Extract comprehensive data from a Facebook post
        Returns: {
            'post_url': str,
            'author_name': str,
            'author_profile_url': str,
            'author_profile_image': str,
            'content': str,
            'images': [str],  # Image URLs
            'timestamp': str,
            'post_type': str,  # 'feed', 'marketplace', 'group'
        }
        """
        try:
            data = {
                'post_url': None,
                'author_name': None,
                'author_profile_url': None,
                'author_profile_image': None,
                'content': None,
                'images': [],
                'timestamp': datetime.now().isoformat(),
                'post_type': 'feed',
            }

            # DEBUG: Get all text from post to see what we're dealing with
            try:
                # Get inner HTML to check if element has content
                inner_html = await post_element.inner_html()
                logger.debug(f"🔍 DEBUG - Post has HTML: {len(inner_html) if inner_html else 0} characters")

                # Show first 500 chars of HTML to see structure
                if inner_html:
                    logger.debug(f"🔍 DEBUG - HTML snippet: {inner_html[:500]}")

                # Try to get text content
                all_post_text = await post_element.inner_text()
                logger.debug(f"🔍 DEBUG - inner_text result: {all_post_text[:300] if all_post_text else 'NONE'}")

                if not all_post_text:
                    all_post_text = await post_element.text_content()
                    logger.debug(f"🔍 DEBUG - text_content result: {all_post_text[:300] if all_post_text else 'NONE'}")

            except Exception as e:
                logger.debug(f"🔍 DEBUG - Error getting post text: {str(e)}")
                import traceback
                logger.debug(f"🔍 DEBUG - Traceback: {traceback.format_exc()}")

            # Extract post URL
            try:
                permalink = await post_element.query_selector('a[href*="/posts/"], a[href*="/photos/"], a[href*="/permalink/"]')
                if permalink:
                    href = await permalink.get_attribute('href')
                    if href:
                        if href.startswith('/'):
                            data['post_url'] = f"https://www.facebook.com{href}"
                        else:
                            data['post_url'] = href
            except:
                pass

            # Extract author information
            try:
                # Author name
                author_link = await post_element.query_selector('a[role="link"] span strong, h2 a, h3 a, h4 a')
                if author_link:
                    data['author_name'] = await author_link.text_content()

                # Author profile URL
                profile_link = await post_element.query_selector('a[role="link"][href*="facebook.com"]')
                if profile_link:
                    href = await profile_link.get_attribute('href')
                    if href:
                        data['author_profile_url'] = href if href.startswith('http') else f"https://www.facebook.com{href}"

                # Author profile image
                profile_img = await post_element.query_selector('image, img[referrerpolicy]')
                if profile_img:
                    src = await profile_img.get_attribute('src') or await profile_img.get_attribute('xlink:href')
                    if src:
                        data['author_profile_image'] = src
            except:
                pass

            # Extract post content/caption
            try:
                # Use inner_text() which is more reliable for visible text
                all_text = await post_element.inner_text()

                if not all_text:
                    # Fallback to text_content if inner_text fails
                    all_text = await post_element.text_content()

                if all_text and len(all_text.strip()) > 20:
                    # Clean up the text
                    lines = [line.strip() for line in all_text.split('\n') if line.strip()]

                    # Filter out UI elements and keep meaningful content
                    skip_words = ['like', 'comment', 'share', 'sponsored', 'see more', 'see less',
                                  'follow', 'more', 'top fan', 'public', 'friends', 'only me']

                    content_lines = []
                    for line in lines:
                        if len(line) > 5:  # At least 5 chars
                            # Check if it's not a UI element
                            line_lower = line.lower()
                            if not any(skip in line_lower for skip in skip_words):
                                content_lines.append(line)

                    if content_lines:
                        # Join first meaningful lines as content
                        data['content'] = ' '.join(content_lines[:10])  # Up to 10 lines
                        logger.debug(f"✅ Extracted content: {data['content'][:100]}...")

            except Exception as e:
                logger.error(f"Error extracting content: {str(e)}")
                pass

            # Extract images
            try:
                images = await post_element.query_selector_all('img[src*="scontent"]')
                for img in images[:5]:  # Limit to 5 images per post
                    src = await img.get_attribute('src')
                    if src and 'scontent' in src:
                        data['images'].append(src)

                # Remove duplicates
                data['images'] = list(set(data['images']))
            except:
                pass

            return data

        except Exception as e:
            logger.error(f"Error extracting post data: {str(e)}")
            return None
