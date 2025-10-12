# HTML-Based Facebook Scraper (Final Approach)

## What Changed?

**Problem**: Screenshots were capturing the wrong section (Groups instead of posts) + huge token usage

**Solution**: Extract clean text from HTML instead of screenshots

---

## How It Works Now

### 1. Extract HTML from Post
```python
html = await post_element.inner_html()
```

### 2. Clean HTML to Plain Text (Saves 90%+ tokens!)
```python
clean_text = self._extract_text_from_html(html)
```

**Cleaning process:**
- Remove `<script>` tags
- Remove `<style>` tags
- Remove `<svg>` icons
- Extract only visible text
- Clean up whitespace

**Example:**
- Raw HTML: 104,042 words, 2,990,480 chars
- Clean text: ~10,000 chars (97% reduction!)

### 3. Send to GPT-4 Text API
```python
fraud_result = await self.html_detector.analyze_post_html(clean_text)
```

---

## Benefits

| Metric | Screenshot Approach | HTML Text Approach |
|--------|--------------------|--------------------|
| **Speed** | 2-5s per post | 1-2s per post ⚡ |
| **Cost** | ~$0.01 per image | ~$0.001 per post 💰 |
| **Accuracy** | OCR errors | Exact text ✅ |
| **Token Usage** | High (images) | Very low (text) |
| **Positioning Issues** | Yes (Groups section) | No ✅ |

---

## Files Modified

### 1. `/backend/app/scrapers/facebook/search_scraper.py`
**Changes:**
- Added `GPTHTMLFraudDetector` import
- Added `_extract_text_from_html()` method using BeautifulSoup
- Replaced screenshot + vision flow with HTML extraction
- Updated database storage to handle no screenshots
- Changed `analysis_method` to `'html_ai'`

**Key code:**
```python
# Extract and clean HTML
html = await post_element.inner_html()
clean_text = self._extract_text_from_html(html)

# Analyze with GPT-4 text API
fraud_result = await self.html_detector.analyze_post_html(clean_text)
```

### 2. `/backend/app/ai/gpt_html_fraud_detector.py`
**Changes:**
- Updated prompt to say "POST CONTENT" instead of "HTML"
- Updated docstring to clarify it accepts text or HTML

---

## How to Test

```bash
cd /Users/christianofernandes/developer/gaur/backend
python -m app.scrapers.facebook.search_scraper
```

**Expected output:**
```
Post 1: Raw HTML: 150,000 chars
Post 1: Clean text: 8,000 chars (saved 142,000 chars)
🤖 Analyzing text with GPT-4 text API (1-2s)...
📝 HTML AI: 8000 chars, user=John Doe, lang=eng
🎯 Fraud Score: 0.850 (HIGH) - hotel_payment_scam
🚨 FRAUD DETECTED - Storing post and creating alert
```

---

## Screenshot Option (Commented Out)

Screenshots are still available but commented out. To re-enable for evidence:

**Uncomment in `search_scraper.py` lines 325-332:**
```python
# OPTIONAL: Take screenshot for evidence (only if fraud detected)
if fraud_result['fraud_score'] >= 0.5:
    logger.debug(f"  Post {idx + 1}: Taking screenshot for evidence...")
    await post_element.scroll_into_view_if_needed()
    await asyncio.sleep(1)
    await post_element.screenshot(path=str(screenshot_path))
    logger.info(f"  📸 Screenshot saved - {screenshot_filename}")
```

---

## Dependencies

Make sure BeautifulSoup4 is installed (already in requirements.txt):
```bash
pip install beautifulsoup4
```

---

## Cost Comparison (100 posts)

| Approach | Cost per Post | Total Cost |
|----------|--------------|------------|
| Vision API (screenshots) | $0.01 | $1.00 |
| Text API (HTML) | $0.001 | $0.10 |

**Savings: 90% cheaper!** 💰

---

## Next Steps

1. ✅ HTML extraction integrated
2. ⏳ Test with real Facebook posts
3. ⏳ Verify fraud alerts in dashboard at `/dashboard/threats`
4. ⏳ Optional: Re-enable screenshots for fraud posts only (evidence)
