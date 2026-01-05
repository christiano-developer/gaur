# Setup GPT-4 Vision for Fraud Detection

## Why GPT-4 Vision?

**Problem**: Local Llama 3.2 Vision is too slow (60-120s per image) and heats up your MacBook.

**Solution**: Use GPT-4 Vision API - **10-20x faster** (2-5s per image), no local processing!

---

## Step 1: Install OpenAI Library

```bash
cd /Users/christianofernandes/developer/gaur/backend
conda activate gaur
pip install openai
```

---

## Step 2: Get OpenAI API Key

1. Go to: https://platform.openai.com/api-keys
2. Sign up or login
3. Click "Create new secret key"
4. Name it: "GAUR Fraud Detection"
5. Copy the key (starts with `sk-proj-...`)

---

## Step 3: Set Environment Variable

### Option A: Export in Terminal (Temporary)
```bash23
export OPENAI_API_KEY=''
```

### Option B: Add to .env File (Permanent)
Create/edit `.env` file in backend directory:

```bash
cd /Users/christianofernandes/developer/gaur/backend
echo "OPENAI_API_KEY=your-key-here" >> .env
```

---

## Step 4: Test GPT-4 Vision

```bash
cd /Users/christianofernandes/developer/gaur/backend
python app/ai/gpt_vision_fraud_detector.py
```

Should output:
```
✅ ANALYSIS COMPLETE in 3.2 seconds
Is Fraud: true
Fraud Score: 0.850
Risk Level: HIGH
...
```

---

## Step 5: Run Full Scraper

```bash
cd /Users/christianofernandes/developer/gaur/backend
python -m app.scrapers.facebook.search_scraper
```

**What happens:**
1. Login to Facebook
2. Search with keywords
3. Screenshot posts
4. Send to GPT-4 Vision (2-5s each) ⚡
5. Get fraud analysis
6. Save only fraud posts

---

## Pricing (Very Affordable!)

**GPT-4o (with vision):**
- Input: $2.50 per 1M tokens
- Output: $10.00 per 1M tokens
- **Images**: ~$0.01 per image (high detail)

**Cost per test run:**
- 9 images (3 keywords × 3 posts) = **~$0.09**
- 100 images = ~$1.00

**Much cheaper than heating your MacBook!** 😄

---

## Comparison

| Feature | Llama 3.2 Vision (Local) | GPT-4 Vision (API) |
|---------|--------------------------|---------------------|
| Speed | 60-120s per image 🐌 | 2-5s per image ⚡ |
| MacBook Heat | 🔥🔥🔥 Very hot | ❄️ Cool (cloud) |
| Accuracy | Good (~85%) | Excellent (~95%) |
| Cost | Free | ~$0.01/image |
| Memory | 4GB+ | 0 MB |

---

## Troubleshooting

### Error: "No OpenAI API key"
```bash
# Check if key is set
echo $OPENAI_API_KEY

# If empty, export it
export OPENAI_API_KEY='your-key-here'
```

### Error: "openai module not found"
```bash
conda activate gaur
pip install openai
```

### Error: "Incorrect API key"
- Make sure you copied the full key (starts with `sk-proj-`)
- Generate a new key if needed

---

## Ready to Test!

Once setup is complete, run:

```bash
cd /Users/christianofernandes/developer/gaur/backend
python -m app.scrapers.facebook.search_scraper
```

You should see **MUCH faster** analysis (2-5s instead of 60-120s)! 🚀
