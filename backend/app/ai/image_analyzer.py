"""
Image Analyzer Service
Performs OCR text extraction and image-based fraud detection
Supports English, Hindi, and Marathi languages
"""
import cv2
import pytesseract
from PIL import Image
import numpy as np
import logging
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import re

logger = logging.getLogger(__name__)


class ImageAnalyzer:
    """
    Analyzes images for fraud detection:
    - OCR text extraction (multi-language)
    - Username extraction
    - Payment app logo detection
    - QR code detection
    """

    def __init__(self):
        """Initialize image analyzer"""
        self.supported_languages = ['eng', 'hin', 'mar']  # English, Hindi, Marathi

        # Payment app keywords for logo detection
        self.payment_keywords = [
            'paytm', 'phonepe', 'gpay', 'googlepay', 'bhim', 'upi',
            'whatsapp pay', 'amazon pay', 'mobikwik', 'freecharge'
        ]

    async def analyze_screenshot(
        self,
        image_path: str,
        extract_username: bool = True,
        detect_fraud_indicators: bool = True
    ) -> Dict:
        """
        Analyze a screenshot and extract all relevant information

        Args:
            image_path: Path to screenshot image
            extract_username: Try to extract username from top of post
            detect_fraud_indicators: Look for fraud indicators (logos, QR codes)

        Returns:
            {
                'text': str - Full OCR extracted text,
                'username': str - Extracted username (if found),
                'language': str - Detected language (eng/hin/mar/mixed),
                'has_payment_logo': bool,
                'has_qr_code': bool,
                'text_lines': [str] - Individual lines of text,
                'confidence': float - OCR confidence score
            }
        """
        try:
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                logger.error(f"Failed to load image: {image_path}")
                return self._empty_result()

            # Convert to RGB (OpenCV uses BGR)
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            pil_image = Image.fromarray(image_rgb)

            # Extract text with multi-language OCR
            ocr_result = await self._extract_text_multilang(pil_image)

            # Extract username from top portion
            username = None
            if extract_username:
                username = await self._extract_username(image_rgb)

            # Detect fraud indicators
            has_payment_logo = False
            has_qr_code = False

            if detect_fraud_indicators:
                has_payment_logo = self._detect_payment_logos(ocr_result['text'])
                has_qr_code = self._detect_qr_code(image)

            result = {
                'text': ocr_result['text'],
                'username': username,
                'language': ocr_result['language'],
                'has_payment_logo': has_payment_logo,
                'has_qr_code': has_qr_code,
                'text_lines': ocr_result['lines'],
                'confidence': ocr_result['confidence']
            }

            logger.info(f"Image analysis complete: {len(result['text'])} chars, lang={result['language']}, user={username}")
            return result

        except Exception as e:
            logger.error(f"Error analyzing screenshot: {str(e)}")
            import traceback
            logger.debug(traceback.format_exc())
            return self._empty_result()

    async def _extract_text_multilang(self, pil_image: Image) -> Dict:
        """
        Extract text using multi-language OCR
        Auto-detects and uses appropriate language model
        """
        try:
            # First pass: Try all languages together
            lang_string = '+'.join(self.supported_languages)  # 'eng+hin+mar'

            # Get detailed OCR data
            ocr_data = pytesseract.image_to_data(
                pil_image,
                lang=lang_string,
                output_type=pytesseract.Output.DICT
            )

            # Extract text with confidence filtering
            texts = []
            confidences = []

            for i, text in enumerate(ocr_data['text']):
                conf = int(ocr_data['conf'][i])
                if conf > 30 and text.strip():  # Filter low confidence
                    texts.append(text.strip())
                    confidences.append(conf)

            full_text = ' '.join(texts)
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0

            # Detect language
            detected_lang = self._detect_language(full_text)

            # Get line-by-line text
            lines = pytesseract.image_to_string(pil_image, lang=lang_string).split('\n')
            lines = [line.strip() for line in lines if line.strip()]

            logger.debug(f"OCR extracted {len(texts)} words, avg confidence: {avg_confidence:.1f}%")

            return {
                'text': full_text,
                'lines': lines,
                'confidence': avg_confidence,
                'language': detected_lang
            }

        except Exception as e:
            logger.error(f"OCR extraction error: {str(e)}")
            return {
                'text': '',
                'lines': [],
                'confidence': 0.0,
                'language': 'unknown'
            }

    async def _extract_username(self, image_rgb: np.ndarray) -> Optional[str]:
        """
        Extract username from top portion of screenshot
        Facebook posts typically have username at the top
        """
        try:
            # Crop top 15% of image (where username usually is)
            height, width = image_rgb.shape[:2]
            top_portion = image_rgb[0:int(height * 0.15), :]

            # Convert to PIL image
            pil_top = Image.fromarray(top_portion)

            # Extract text from top portion
            text = pytesseract.image_to_string(pil_top, lang='eng+hin+mar')

            # Username is usually first non-empty line
            lines = [line.strip() for line in text.split('\n') if line.strip()]

            if lines:
                # Clean up username (remove extra characters)
                username = lines[0]
                # Remove common UI elements
                username = re.sub(r'\s+(·|•|@|Sponsored|Follow).*', '', username)
                username = username.strip()

                if len(username) > 2 and len(username) < 100:  # Reasonable username length
                    logger.debug(f"Extracted username: {username}")
                    return username

            return None

        except Exception as e:
            logger.debug(f"Username extraction failed: {str(e)}")
            return None

    def _detect_language(self, text: str) -> str:
        """
        Detect primary language in text
        Returns: 'eng', 'hin', 'mar', 'mixed', or 'unknown'
        """
        if not text:
            return 'unknown'

        # Check for Devanagari script (Hindi/Marathi)
        devanagari_pattern = re.compile(r'[\u0900-\u097F]')
        has_devanagari = bool(devanagari_pattern.search(text))

        # Check for Latin script (English)
        latin_pattern = re.compile(r'[a-zA-Z]')
        has_latin = bool(latin_pattern.search(text))

        if has_devanagari and has_latin:
            return 'mixed'
        elif has_devanagari:
            # Could be Hindi or Marathi (both use Devanagari)
            # For now, return 'hin' (can be enhanced with language detection)
            return 'hin'
        elif has_latin:
            return 'eng'
        else:
            return 'unknown'

    def _detect_payment_logos(self, text: str) -> bool:
        """
        Detect payment app names in text
        (Could be enhanced with actual logo detection using CV)
        """
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in self.payment_keywords)

    def _detect_qr_code(self, image: np.ndarray) -> bool:
        """
        Detect QR codes in image using OpenCV
        """
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

            # Initialize QR code detector
            qr_detector = cv2.QRCodeDetector()

            # Detect and decode
            data, bbox, straight_qr = qr_detector.detectAndDecode(gray)

            return bbox is not None

        except Exception as e:
            logger.debug(f"QR detection failed: {str(e)}")
            return False

    def _empty_result(self) -> Dict:
        """Return empty result structure"""
        return {
            'text': '',
            'username': None,
            'language': 'unknown',
            'has_payment_logo': False,
            'has_qr_code': False,
            'text_lines': [],
            'confidence': 0.0
        }


# Test function
async def test_image_analyzer():
    """Test the image analyzer with a sample screenshot"""
    analyzer = ImageAnalyzer()

    # Test with a sample screenshot (you'll need to provide one)
    test_image_path = "/Users/christianofernandes/developer/gaur/backend/debug_facebook_feed.png"

    if not Path(test_image_path).exists():
        print(f"Test image not found: {test_image_path}")
        print("Please provide a screenshot to test")
        return

    print("\n" + "=" * 60)
    print("IMAGE ANALYZER TEST")
    print("=" * 60)

    result = await analyzer.analyze_screenshot(test_image_path)

    print(f"\n✅ Analysis Complete:")
    print(f"  Username: {result['username']}")
    print(f"  Language: {result['language']}")
    print(f"  Confidence: {result['confidence']:.1f}%")
    print(f"  Text length: {len(result['text'])} characters")
    print(f"  Payment logo detected: {result['has_payment_logo']}")
    print(f"  QR code detected: {result['has_qr_code']}")
    print(f"\n  Extracted text (first 300 chars):")
    print(f"  {result['text'][:300]}...")
    print(f"\n  Lines extracted: {len(result['text_lines'])}")
    for i, line in enumerate(result['text_lines'][:5], 1):
        print(f"    {i}. {line}")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    import asyncio
    logging.basicConfig(level=logging.INFO)
    asyncio.run(test_image_analyzer())
