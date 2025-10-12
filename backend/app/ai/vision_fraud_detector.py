"""
Vision-based Fraud Detector
Uses Llama 3.2 Vision to analyze Facebook post screenshots for fraud
Replaces OCR + keyword approach with AI vision analysis
"""
import base64
import requests
import logging
from typing import Dict, Optional
from pathlib import Path
import json

logger = logging.getLogger(__name__)


class VisionFraudDetector:
    """
    AI Vision-based fraud detection for Facebook screenshots
    Uses Llama 3.2 Vision model via Ollama
    """

    def __init__(self, model: str = "llama3.2-vision", base_url: str = "http://localhost:11434"):
        self.model = model
        self.base_url = base_url

    async def analyze_screenshot(self, image_path: str) -> Dict:
        """
        Analyze a Facebook post screenshot for fraud using AI vision

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
        try:
            # Read image and convert to base64
            with open(image_path, 'rb') as img_file:
                image_data = base64.b64encode(img_file.read()).decode('utf-8')

            # Fraud detection prompt
            prompt = self._build_fraud_prompt()

            # Call Ollama Vision API
            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "images": [image_data],
                    "stream": False,
                    "format": "json",
                    "options": {
                        "temperature": 0.1,  # Low temperature for consistent analysis
                        "num_predict": 300,   # Reduced for faster response
                    }
                },
                timeout=180  # Increased to 3 minutes for vision model
            )

            if response.status_code != 200:
                logger.error(f"Ollama Vision API error: {response.status_code}")
                return self._fallback_analysis()

            result = response.json()
            llm_output = result.get("response", "")

            # Parse JSON response
            try:
                analysis = json.loads(llm_output)

                # Validate and normalize output
                return self._normalize_analysis(analysis)

            except json.JSONDecodeError as e:
                logger.error(f"Vision model returned invalid JSON: {llm_output[:200]}")
                return self._fallback_analysis()

        except requests.exceptions.ConnectionError:
            logger.error("Cannot connect to Ollama. Is it running? Run: ollama serve")
            return self._fallback_analysis()
        except FileNotFoundError:
            logger.error(f"Screenshot not found: {image_path}")
            return self._fallback_analysis()
        except Exception as e:
            logger.error(f"Vision analysis error: {str(e)}")
            import traceback
            logger.debug(traceback.format_exc())
            return self._fallback_analysis()

    def _build_fraud_prompt(self) -> str:
        """Build simplified fraud detection prompt for faster inference"""
        return """Analyze this Facebook post for fraud. Look for:
- Scam keywords: advance payment, UPI, cheap hotel, guaranteed returns, urgent, limited offer
- Phone numbers in post
- Excessive discounts (50%+ off)
- Pressure tactics

Extract username and post text.

Return JSON:
{
    "is_fraud": true/false,
    "fraud_score": 0.0-1.0,
    "risk_level": "HIGH"/"MEDIUM"/"LOW",
    "fraud_type": "hotel_scam"/"investment_scam"/"payment_fraud"/"legitimate",
    "reasoning": "brief explanation",
    "username": "author name",
    "content": "post text",
    "language": "eng"/"hin"/"mar"/"mixed",
    "red_flags": ["issues found"],
    "matched_keywords": ["fraud keywords"]
}"""

    def _normalize_analysis(self, analysis: Dict) -> Dict:
        """Normalize and validate vision model output"""
        # Ensure all required fields exist
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

        logger.info(f"Vision analysis: score={normalized['fraud_score']:.3f}, risk={normalized['risk_level']}")
        logger.debug(f"Red flags: {normalized['red_flags']}")

        return normalized

    def _fallback_analysis(self) -> Dict:
        """Return safe fallback when vision analysis fails"""
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

    def check_model_available(self) -> bool:
        """Check if Llama 3.2 Vision is available"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            if response.status_code == 200:
                models = response.json().get("models", [])
                model_names = [m.get("name") for m in models]
                logger.info(f"Available Ollama models: {model_names}")

                if self.model in model_names or f"{self.model}:latest" in model_names:
                    logger.info(f"✅ Vision model {self.model} is available")
                    return True
                else:
                    logger.warning(f"❌ Vision model {self.model} not found. Run: ollama pull {self.model}")
                    return False
            return False
        except requests.exceptions.ConnectionError:
            logger.error("❌ Ollama is not running. Start it with: ollama serve")
            return False
        except Exception as e:
            logger.error(f"Error checking Ollama: {str(e)}")
            return False


# Test function
async def test_vision_detector():
    """Test the vision fraud detector with a screenshot"""
    detector = VisionFraudDetector(model="llama3.2-vision")

    # Check if model is available
    if not detector.check_model_available():
        print("\n" + "="*80)
        print("SETUP INSTRUCTIONS:")
        print("="*80)
        print("1. Make sure Ollama is running: ollama serve")
        print("2. Pull vision model: ollama pull llama3.2-vision")
        print("="*80)
        return

    # Test with existing screenshot
    test_image = "/Users/christianofernandes/developer/gaur/backend/debug_facebook_feed.png"

    if not Path(test_image).exists():
        print(f"Test image not found: {test_image}")
        print("Please provide a Facebook screenshot to test")
        return

    print("\n" + "="*80)
    print("VISION FRAUD DETECTOR TEST")
    print("="*80)
    print(f"Analyzing: {test_image}")
    print("This may take 10-15 seconds...")

    result = await detector.analyze_screenshot(test_image)

    print("\n✅ ANALYSIS COMPLETE:")
    print("="*80)
    print(f"Is Fraud: {result['is_fraud']}")
    print(f"Fraud Score: {result['fraud_score']:.3f}")
    print(f"Risk Level: {result['risk_level']}")
    print(f"Fraud Type: {result['fraud_type']}")
    print(f"\nUsername: {result['username']}")
    print(f"Language: {result['language']}")
    print(f"\nReasoning:")
    print(f"  {result['reasoning']}")
    print(f"\nRed Flags Found ({len(result['red_flags'])}):")
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
    asyncio.run(test_vision_detector())
