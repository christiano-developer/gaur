"""
GPT-4 Vision Fraud Detector
Uses OpenAI GPT-4 Vision to analyze Facebook post screenshots
MUCH faster than local Llama model (2-5s vs 60-120s)
"""
import base64
import logging
from typing import Dict
import json
import os

logger = logging.getLogger(__name__)


class GPTVisionFraudDetector:
    """
    GPT-4 Vision-based fraud detection for Facebook screenshots
    Fast, accurate, cloud-based analysis
    """

    def __init__(self, api_key: str = None):
        """
        Initialize GPT-4 Vision detector

        Args:
            api_key: OpenAI API key (or set OPENAI_API_KEY env var)
        """
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')

        if not self.api_key:
            logger.warning("No OpenAI API key provided. Set OPENAI_API_KEY environment variable.")
            logger.warning("Get your API key from: https://platform.openai.com/api-keys")

    async def analyze_screenshot(self, image_path: str) -> Dict:
        """
        Analyze a Facebook post screenshot using GPT-4 Vision

        Args:
            image_path: Path to screenshot image

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

            # Read and encode image
            with open(image_path, 'rb') as img_file:
                image_data = base64.b64encode(img_file.read()).decode('utf-8')

            # Build prompt
            prompt = self._build_fraud_prompt()

            logger.info("Sending image to GPT-4 Vision...")

            # Call GPT-4 Vision API
            response = client.chat.completions.create(
                model="gpt-4o",  # Latest GPT-4 with vision
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{image_data}",
                                    "detail": "high"  # High detail for better fraud detection
                                }
                            }
                        ]
                    }
                ],
                max_tokens=500,
                temperature=0.1,  # Low temperature for consistent analysis
                response_format={"type": "json_object"}  # Force JSON response
            )

            # Parse response
            result_text = response.choices[0].message.content
            logger.debug(f"GPT-4 Vision response: {result_text[:200]}...")

            # Parse JSON
            analysis = json.loads(result_text)

            # Normalize output
            normalized = self._normalize_analysis(analysis)

            logger.info(f"GPT-4 Vision analysis: score={normalized['fraud_score']:.3f}, risk={normalized['risk_level']}")

            return normalized

        except json.JSONDecodeError as e:
            logger.error(f"GPT-4 returned invalid JSON: {result_text[:200]}")
            return self._fallback_analysis()
        except FileNotFoundError:
            logger.error(f"Screenshot not found: {image_path}")
            return self._fallback_analysis()
        except Exception as e:
            logger.error(f"GPT-4 Vision analysis error: {str(e)}")
            import traceback
            logger.debug(traceback.format_exc())
            return self._fallback_analysis()

    def _build_fraud_prompt(self) -> str:
        """Build fraud detection prompt for GPT-4 Vision"""
        return """Analyze this Facebook post screenshot for fraud indicators.

You are analyzing posts for Goa Police cyber patrol. Check for:

FRAUD INDICATORS:
- Scam keywords: advance payment, send money, UPI, Paytm, PhonePe, cheap hotel, free trip, guaranteed returns, limited offer, urgent, act now
- Hindi/Marathi fraud keywords: पैसे भेजो, बुकिंग, सस्ता, मुफ्त, तुरंत
- Phone numbers displayed prominently
- Excessive discounts (50%+ off)
- Fake payment screenshots
- Pressure tactics (urgent, limited time, act now)
- Too-good-to-be-true offers
- Multiple payment methods mentioned

EXTRACT:
- Author/username
- Post text content
- Language (English/Hindi/Marathi/Mixed)

SCORING:
- 0.0-0.3: Legitimate
- 0.4-0.6: Suspicious
- 0.7-1.0: Fraud

Return ONLY valid JSON:
{
    "is_fraud": true/false,
    "fraud_score": 0.85,
    "risk_level": "HIGH"/"MEDIUM"/"LOW",
    "fraud_type": "hotel_booking_scam"/"investment_scam"/"advance_payment_fraud"/"gambling_scam"/"legitimate",
    "reasoning": "brief explanation",
    "username": "extracted author name",
    "content": "extracted post text",
    "language": "eng"/"hin"/"mar"/"mixed",
    "red_flags": ["specific issues found"],
    "matched_keywords": ["fraud keywords found"]
}

Be precise and factual."""

    def _normalize_analysis(self, analysis: Dict) -> Dict:
        """Normalize GPT-4 Vision output"""
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
            'reasoning': 'Vision analysis failed, treating as non-fraud for safety',
            'username': None,
            'content': '',
            'language': 'unknown',
            'red_flags': [],
            'matched_keywords': []
        }


# Test function
async def test_gpt_vision():
    """Test GPT-4 Vision fraud detector"""
    import os
    from pathlib import Path

    # Check for API key
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("\n" + "="*80)
        print("SETUP REQUIRED:")
        print("="*80)
        print("1. Get OpenAI API key from: https://platform.openai.com/api-keys")
        print("2. Set environment variable:")
        print("   export OPENAI_API_KEY='your-api-key-here'")
        print("   OR add to .env file:")
        print("   OPENAI_API_KEY=your-api-key-here")
        print("="*80)
        return

    detector = GPTVisionFraudDetector(api_key=api_key)

    # Test with screenshot
    test_image = "/Users/christianofernandes/developer/gaur/backend/data/images/facebook/fb_search_cheap_hotel_goa_20251011_043824_0.png"

    if not Path(test_image).exists():
        # Try to find any screenshot
        image_dir = Path("/Users/christianofernandes/developer/gaur/backend/data/images/facebook")
        screenshots = list(image_dir.glob("*.png"))
        if screenshots:
            test_image = str(screenshots[0])
        else:
            print(f"No test images found in {image_dir}")
            return

    print("\n" + "="*80)
    print("GPT-4 VISION FRAUD DETECTOR TEST")
    print("="*80)
    print(f"Analyzing: {Path(test_image).name}")
    print("This should take 2-5 seconds...")

    import time
    start = time.time()

    result = await detector.analyze_screenshot(test_image)

    elapsed = time.time() - start

    print(f"\n✅ ANALYSIS COMPLETE in {elapsed:.1f} seconds")
    print("="*80)
    print(f"Is Fraud: {result['is_fraud']}")
    print(f"Fraud Score: {result['fraud_score']:.3f}")
    print(f"Risk Level: {result['risk_level']}")
    print(f"Fraud Type: {result['fraud_type']}")
    print(f"\nUsername: {result['username']}")
    print(f"Language: {result['language']}")
    print(f"\nReasoning:")
    print(f"  {result['reasoning']}")
    print(f"\nRed Flags ({len(result['red_flags'])}):")
    for flag in result['red_flags']:
        print(f"  - {flag}")
    print(f"\nMatched Keywords ({len(result['matched_keywords'])}):")
    print(f"  {', '.join(result['matched_keywords'][:10])}")
    print(f"\nExtracted Content (first 200 chars):")
    print(f"  {result['content'][:200]}...")
    print("="*80)


if __name__ == "__main__":
    import asyncio
    logging.basicConfig(level=logging.INFO)
    asyncio.run(test_gpt_vision())
