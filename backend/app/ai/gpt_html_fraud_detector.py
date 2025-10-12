"""
GPT-4 HTML-based Fraud Detector
Analyzes Facebook post HTML directly (faster & cheaper than vision)
Uses GPT-4 text API instead of vision API
"""
import logging
from typing import Dict
import json
import os
import re

logger = logging.getLogger(__name__)


class GPTHTMLFraudDetector:
    """
    GPT-4 HTML-based fraud detection for Facebook posts
    Analyzes HTML content instead of screenshots
    MUCH faster and cheaper than vision API
    """

    def __init__(self, api_key: str = None):
        """
        Initialize GPT-4 HTML detector

        Args:
            api_key: OpenAI API key (or set OPENAI_API_KEY env var)
        """
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')

        if not self.api_key:
            logger.warning("No OpenAI API key provided. Set OPENAI_API_KEY environment variable.")

    async def analyze_post_html(self, html: str) -> Dict:
        """
        Analyze Facebook post content for fraud

        Args:
            html: Raw HTML or clean text from Facebook post element

        Returns:
            {
                'is_fraud': bool,
                'fraud_score': float (0.0 to 1.0),
                'risk_level': str ('HIGH', 'MEDIUM', 'LOW'),
                'fraud_type': str,
                'reasoning': str,
                'username': str,
                'content': str,
                'language': str,
                'red_flags': [str],
                'matched_keywords': [str]
            }
        """
        if not self.api_key:
            logger.error("OpenAI API key not configured")
            return self._fallback_analysis()

        try:
            # Import OpenAI library
            try:
                from openai import OpenAI
            except ImportError:
                logger.error("OpenAI library not installed. Run: pip install openai")
                return self._fallback_analysis()

            # Initialize OpenAI client
            client = OpenAI(api_key=self.api_key)

            # Clean HTML (remove script tags, truncate if too long)
            cleaned_html = self._clean_html(html)

            if not cleaned_html or len(cleaned_html) < 50:
                logger.warning(f"HTML too short after cleaning: {len(cleaned_html)} chars")
                return self._fallback_analysis()

            # Build prompt
            prompt = self._build_fraud_prompt(cleaned_html)

            logger.info("Sending HTML to GPT-4 for analysis...")

            # Call GPT-4 text API (cheaper and faster than vision!)
            response = client.chat.completions.create(
                model="gpt-4o",  # Latest GPT-4
                messages=[
                    {
                        "role": "system",
                        "content": "You are a fraud detection AI for Goa Police cyber patrol. Analyze Facebook post HTML for fraud indicators."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=500,
                temperature=0.1,  # Low temperature for consistent analysis
                response_format={"type": "json_object"}  # Force JSON response
            )

            # Parse response
            result_text = response.choices[0].message.content
            logger.debug(f"GPT-4 response: {result_text[:200]}...")

            # Parse JSON
            analysis = json.loads(result_text)

            # Normalize output
            normalized = self._normalize_analysis(analysis)

            logger.info(f"GPT-4 HTML analysis: score={normalized['fraud_score']:.3f}, risk={normalized['risk_level']}")

            return normalized

        except json.JSONDecodeError as e:
            logger.error(f"GPT-4 returned invalid JSON: {result_text[:200]}")
            return self._fallback_analysis()
        except Exception as e:
            logger.error(f"GPT-4 HTML analysis error: {str(e)}")
            import traceback
            logger.debug(traceback.format_exc())
            return self._fallback_analysis()

    def _clean_html(self, html: str) -> str:
        """Clean and truncate HTML for analysis"""
        # Remove script tags
        html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)

        # Remove style tags
        html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)

        # Remove comments
        html = re.sub(r'<!--.*?-->', '', html, flags=re.DOTALL)

        # Truncate if too long (GPT-4 has token limits)
        max_length = 15000  # ~3750 tokens
        if len(html) > max_length:
            html = html[:max_length] + "\n... [truncated]"

        return html.strip()

    def _build_fraud_prompt(self, html: str) -> str:
        """Build fraud detection prompt"""
        return f"""Analyze this Facebook post content for fraud indicators.

POST CONTENT:
```
{html}
```

FRAUD INDICATORS TO CHECK:
- Scam keywords: advance payment, send money, UPI, Paytm, PhonePe, cheap hotel, free trip, guaranteed returns, limited offer, urgent
- Hindi/Marathi keywords: पैसे भेजो, बुकिंग, सस्ता, मुफ्त
- Phone numbers displayed
- Excessive discounts (50%+ off)
- Pressure tactics (urgent, limited time, act now)
- Multiple payment methods mentioned
- Too-good-to-be-true offers

EXTRACT:
- Author/username (from post HTML)
- Post text content (visible text only)
- Language (English/Hindi/Marathi/Mixed)

SCORING:
- 0.0-0.3: Legitimate
- 0.4-0.6: Suspicious
- 0.7-1.0: Fraud

Return ONLY valid JSON:
{{
    "is_fraud": true/false,
    "fraud_score": 0.85,
    "risk_level": "HIGH"/"MEDIUM"/"LOW",
    "fraud_type": "hotel_booking_scam"/"investment_scam"/"advance_payment_fraud"/"legitimate",
    "reasoning": "brief explanation",
    "username": "extracted author name",
    "content": "extracted post text",
    "language": "eng"/"hin"/"mar"/"mixed",
    "red_flags": ["specific issues"],
    "matched_keywords": ["fraud keywords found"]
}}

Be precise and factual."""

    def _normalize_analysis(self, analysis: Dict) -> Dict:
        """Normalize GPT-4 output"""
        normalized = {
            'is_fraud': analysis.get('is_fraud', False),
            'fraud_score': float(analysis.get('fraud_score', 0.0)),
            'risk_level': analysis.get('risk_level', 'LOW'),
            'fraud_type': analysis.get('fraud_type', 'suspicious_content'),
            'reasoning': analysis.get('reasoning', 'No analysis provided'),
            'username': analysis.get('username'),
            'content': analysis.get('content', ''),
            'language': analysis.get('language', 'unknown'),
            'red_flags': analysis.get('red_flags', []),
            'matched_keywords': analysis.get('matched_keywords', [])
        }

        # Ensure fraud_score is in valid range
        normalized['fraud_score'] = max(0.0, min(1.0, normalized['fraud_score']))

        # Ensure risk_level is valid
        if normalized['risk_level'] not in ['HIGH', 'MEDIUM', 'LOW']:
            if normalized['fraud_score'] >= 0.7:
                normalized['risk_level'] = 'HIGH'
            elif normalized['fraud_score'] >= 0.4:
                normalized['risk_level'] = 'MEDIUM'
            else:
                normalized['risk_level'] = 'LOW'

        return normalized

    def _fallback_analysis(self) -> Dict:
        """Return safe fallback when analysis fails"""
        return {
            'is_fraud': False,
            'fraud_score': 0.0,
            'risk_level': 'LOW',
            'fraud_type': 'analysis_failed',
            'reasoning': 'HTML analysis failed, treating as non-fraud for safety',
            'username': None,
            'content': '',
            'language': 'unknown',
            'red_flags': [],
            'matched_keywords': []
        }


# Test function
async def test_gpt_html():
    """Test GPT-4 HTML fraud detector"""
    import os

    # Check for API key
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("\n" + "="*80)
        print("ERROR: OPENAI_API_KEY not set")
        print("="*80)
        return

    detector = GPTHTMLFraudDetector(api_key=api_key)

    # Test HTML (example Facebook post)
    test_html = """
    <div role="article">
        <h2>Goa Beach Resort</h2>
        <span>Sponsored</span>
        <div>
            <p>URGENT! Luxury beach resort in Goa - 70% OFF!</p>
            <p>Book now and send advance payment of ₹5000 via UPI</p>
            <p>Contact: 9876543210</p>
            <p>Limited time offer! Only 2 rooms left!</p>
        </div>
    </div>
    """

    print("\n" + "="*80)
    print("GPT-4 HTML FRAUD DETECTOR TEST")
    print("="*80)

    result = await detector.analyze_post_html(test_html)

    print(f"\n✅ ANALYSIS COMPLETE:")
    print(f"Is Fraud: {result['is_fraud']}")
    print(f"Fraud Score: {result['fraud_score']:.3f}")
    print(f"Risk Level: {result['risk_level']}")
    print(f"Fraud Type: {result['fraud_type']}")
    print(f"\nUsername: {result['username']}")
    print(f"Content: {result['content'][:100]}...")
    print(f"Language: {result['language']}")
    print(f"\nRed Flags: {result['red_flags']}")
    print(f"Keywords: {result['matched_keywords']}")
    print(f"\nReasoning: {result['reasoning']}")
    print("="*80)


if __name__ == "__main__":
    import asyncio
    logging.basicConfig(level=logging.INFO)
    asyncio.run(test_gpt_html())
