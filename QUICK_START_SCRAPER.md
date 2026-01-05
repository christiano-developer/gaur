# GAUR Facebook Scraper - Quick Start Guide

## 🚀 FASTEST WAY TO GET STARTED

### **1. Install Dependencies** (One Time)

```bash
cd /Users/christianofernandes/developer/gaur/backend
pip install playwright
playwright install chromium
```

### **2. Set Your Facebook Credentials**

Create a `.env` file in the `backend` directory by copying the example file:

```bash
cp backend/.env.example backend/.env
```

Now, open `backend/.env` and add your Facebook credentials:

```
FB_EMAIL=your_facebook_email@example.com
FB_PASSWORD=your_facebook_password
```

### **3. Run Scraper (Manual Test)**

```bash
cd /Users/christianofernandes/developer/gaur/backend
python -m app.scrapers.facebook.feed_scraper
```

**What Happens**:
- Opens Chrome browser (you'll see it)
- Logs into Facebook (wait for 2FA if enabled)
- Scrapes 3 batches of 10 posts each (30 posts total)
- AI analyzes each post
- Saves only fraud posts to database
- Prints summary at the end

**Expected Time**: 3-5 minutes

### **4. Check Results in Database**

```bash
psql gaur_police_db
```

```sql
-- See fraud posts detected
SELECT
    id,
    author_name,
    fraud_confidence,
    fraud_type,
    LEFT(content, 80) as preview
FROM ai_scraped_posts
WHERE is_fraudulent = true
ORDER BY scraped_at DESC
LIMIT 10;
```

### **5. View in API**

```bash
# Start backend (if not running)
cd /Users/christianofernandes/developer/gaur/backend
python run.py

# In another terminal, test API:
curl http://localhost:8000/api/v1/ai-hub/fraud-posts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📁 FILES YOU CARE ABOUT

| File | Purpose |
|------|---------|
| `backend/app/scrapers/facebook/feed_scraper.py` | Main scraper logic |
| `backend/app/ai/fraud_detector.py` | AI fraud detection |
| `backend/app/api/v1/ai_hub.py` | API endpoints |
| `FRESH_SCRAPER_IMPLEMENTATION.md` | Full documentation |

---

## ⚙️ CONFIGURATION OPTIONS

**In `feed_scraper.py` main() function**:

```python
scraper = FacebookFeedScraper(
    email=EMAIL,
    password=PASSWORD,
    headless=False,      # True = hidden browser, False = visible
    batch_size=10        # Posts per batch
)

result = await scraper.scrape_feed(
    num_batches=3        # Number of batches to scrape
)
```

**Adjust these to**:
- `headless=True` → Run in background (faster, no browser window)
- `batch_size=20` → Scrape more posts per batch
- `num_batches=5` → Scrape more batches (50 posts total)

---

## 🐛 TROUBLESHOOTING

### **Issue: "Login failed"**
**Solution**: Check credentials, try manual login first

### **Issue: "2FA Required"**
**Solution**: Approve on phone within 60 seconds

### **Issue: "No posts scraped"**
**Solution**: Facebook feed might be empty, try different account

### **Issue**: "Module not found: playwright"**
**Solution**: Run `pip install playwright && playwright install chromium`

---

## 🎯 WHAT YOU GET

After one successful run:
- ✅ 30 posts scraped
- ✅ ~8-12 fraud posts detected and stored
- ✅ Full metadata (author, images, URLs, AI analysis)
- ✅ Ready to display in frontend!

---

## 📞 NEXT STEPS

1. **Now**: Test the scraper manually (follow steps above)
2. **Next**: Build frontend AI Hub page to display fraud posts
3. **Later**: Add Marketplace, Groups, Search scrapers
4. **Future**: Schedule automatic scraping every 2 hours

**You're ready to start scraping!** 🚀
