"""
LLM-based HTML extractor for Facebook posts
Uses local Ollama model to extract structured data from raw HTML
"""
import json
import requests
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class LLMExtractor:
    """Extract structured data from HTML using local LLM"""

    def __init__(self, model: str = "llama3.2:3b", base_url: str = "http://localhost:11434"):
        self.model = model
        self.base_url = base_url

    async def extract_post_data(self, html: str) -> Optional[Dict]:
        """
        Extract post data from raw HTML using LLM

        Args:
            html: Raw HTML of the post

        Returns:
            Dict with extracted data or None
        """
        try:
            # Truncate HTML if too long (LLMs have context limits)
            max_html_length = 8000
            if len(html) > max_html_length:
                html = html[:max_html_length] + "..."

            prompt = f"""Extract information from this Facebook post HTML.

HTML:
```
{html}
```

Return ONLY valid JSON with this structure:
{{
    "is_sponsored": true/false,
    "author": "author name or null",
    "content": "post text content or null",
    "has_image": true/false
}}

Rules:
- If you see "Sponsored" or "data-ad-" attributes, set is_sponsored to true
- Extract the actual post text, not UI elements like "Like", "Comment", "Share"
- Only extract visible content
- Return valid JSON only, no explanation

JSON:"""

            # Call Ollama API
            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json",  # Force JSON output
                    "options": {
                        "temperature": 0.1,  # Low temperature for consistent extraction
                        "num_predict": 200,  # Limit response length
                    }
                },
                timeout=30
            )

            if response.status_code != 200:
                logger.error(f"Ollama API error: {response.status_code}")
                return None

            result = response.json()
            llm_output = result.get("response", "")

            # Parse JSON response
            try:
                data = json.loads(llm_output)
                logger.debug(f"LLM extracted: {data}")
                return data
            except json.JSONDecodeError as e:
                logger.error(f"LLM returned invalid JSON: {llm_output[:200]}")
                return None

        except requests.exceptions.ConnectionError:
            logger.error("Cannot connect to Ollama. Is it running? Run: ollama serve")
            return None
        except Exception as e:
            logger.error(f"LLM extraction error: {str(e)}")
            return None

    def check_ollama_available(self) -> bool:
        """Check if Ollama is running and model is available"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            if response.status_code == 200:
                models = response.json().get("models", [])
                model_names = [m.get("name") for m in models]
                logger.info(f"Available Ollama models: {model_names}")

                if self.model in model_names:
                    logger.info(f"✅ Model {self.model} is available")
                    return True
                else:
                    logger.warning(f"❌ Model {self.model} not found. Run: ollama pull {self.model}")
                    return False
            return False
        except requests.exceptions.ConnectionError:
            logger.error("❌ Ollama is not running. Start it with: ollama serve")
            return False
        except Exception as e:
            logger.error(f"Error checking Ollama: {str(e)}")
            return False


# Test function
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    extractor = LLMExtractor(model="llama3.2:3b")

    # Check if Ollama is available
    if not extractor.check_ollama_available():
        print("\n" + "=" * 80)
        print("SETUP INSTRUCTIONS:")
        print("=" * 80)
        print("1. Install Ollama: brew install ollama")
        print("2. Start Ollama: ollama serve")
        print("3. Pull model: ollama pull llama3.2:3b")
        print("=" * 80)
        exit(1)

    # Test with sample HTML
    test_html = """
    <div role="article">
        <h4>John Doe</h4>
        <div>
            <span>Just saw an amazing sunset! 🌅</span>
        </div>
        <img src="https://scontent.facebook.com/image.jpg" />
        <div>Like</div>
        <div>Comment</div>
    </div>
    """

    import asyncio
    result = asyncio.run(extractor.extract_post_data(test_html))

    print("\n" + "=" * 80)
    print("EXTRACTION RESULT:")
    print("=" * 80)
    print(json.dumps(result, indent=2))
    print("=" * 80)
