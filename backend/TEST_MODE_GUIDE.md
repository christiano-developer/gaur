# Test Mode Guide - Facebook Scraper

## What is Test Mode?

Test mode saves extracted HTML and cleaned text to files **instead of** sending to OpenAI API. This lets you verify what content will be sent before spending tokens.

---

## How to Enable Test Mode

In `search_scraper.py` line 654:
```python
TEST_MODE = True  # Set to False for production (API calls)
```

**Test Mode ON**: Saves files, no API calls, no database storage
**Test Mode OFF**: Calls GPT-4 API, stores fraud posts in database

---

## Running Test

```bash
cd /Users/christianofernandes/developer/gaur/backend
python -m app.scrapers.facebook.search_scraper
```

---

## What Gets Saved

### Output Directory
```
/Users/christianofernandes/developer/gaur/data/test_output/
```

### Files Created (per post):
**`post_[keyword]_[timestamp]_[index].txt`**
- Clean text that would be sent to GPT-4 API
- Includes metadata (keyword, lengths, token savings)
- This is what you should review!

*Note: Raw HTML is NOT saved (too large)*

---

## Example Output

### Clean Text File Format:
```
KEYWORD: cheap hotel goa
POST INDEX: 0
RAW HTML LENGTH: 150,423 chars
CLEAN TEXT LENGTH: 8,234 chars
TOKEN SAVINGS: 142,189 chars (94.5%)
================================================================================
CLEAN TEXT CONTENT:
================================================================================
John Doe Sponsored 2 hours ago Luxury Beach Resort Goa - 70% OFF!
Book now with advance payment via UPI Contact: 9876543210
Limited offer - only 2 rooms left! ...
```

---

## What to Check

✅ **Review the clean text files** to verify:
1. Post content is extracted correctly
2. Username/author is present
3. No unnecessary HTML tags remain
4. Fraud keywords are visible (if present)
5. Token savings are significant (should be 90%+)

❌ **If you see issues**:
- Too much noise → Update `_extract_text_from_html()` method
- Missing content → HTML structure may have changed
- Wrong sections → Check post element selector

---

## Switching to Production Mode

Once you've verified the extracted content looks good:

1. **Change line 654** in `search_scraper.py`:
   ```python
   TEST_MODE = False  # Production mode
   ```

2. **Run again**:
   ```bash
   python -m app.scrapers.facebook.search_scraper
   ```

3. **Expected behavior**:
   - Clean text sent to GPT-4 API
   - Fraud analysis performed
   - Fraud posts stored in database
   - Alerts created in `ai_fraud_alerts` table

---

## Benefits of Test Mode

| Benefit | Description |
|---------|-------------|
| 💰 **Save Money** | No API calls = no token costs |
| 🔍 **Verify Content** | See exactly what GPT-4 will analyze |
| 🐛 **Debug Issues** | Review extracted text quality |
| 📊 **Measure Savings** | See token reduction percentage |

---

## Example Test Run

```
🧪 TEST MODE ENABLED - Will save extracted text to files instead of API calls
Test output directory: /Users/christianofernandes/developer/gaur/data/test_output

KEYWORD 1/3: 'cheap hotel goa'
  📄 Post 0: Raw HTML: 150,423 chars
  ✨ Post 0: Clean text: 8,234 chars (saved 142,189 chars)
  💾 SAVED: post_cheap_hotel_goa_20250112_143022_0.txt

============================================================
FINAL RESULTS
============================================================
🧪 TEST MODE - Files saved to: /Users/christianofernandes/developer/gaur/data/test_output
Total posts extracted: 9

Check the *.txt files to review clean text that would be sent to API
============================================================
```

---

## Next Steps

1. ✅ Enable test mode (`TEST_MODE = True`)
2. ✅ Run scraper
3. ✅ Review clean text files in `/data/test_output/`
4. ✅ Verify content looks good
5. ⏳ Switch to production mode (`TEST_MODE = False`)
6. ⏳ Run for real fraud detection
