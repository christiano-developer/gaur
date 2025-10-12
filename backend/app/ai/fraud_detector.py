"""
AI Fraud Detector
Analyzes text content for fraud patterns using ML + keywords
"""

import re
import logging
from typing import Dict, List

logger = logging.getLogger(__name__)


class FraudDetector:
    """
    Hybrid ML + Keyword fraud detection system
    """

    def __init__(self):
        self.fraud_keywords = self._load_fraud_keywords()
        self.fraud_patterns = self._load_fraud_patterns()

    def _load_fraud_keywords(self) -> List[str]:
        """Load comprehensive fraud keyword list"""
        return [
            # Payment/Financial - English
            'advance payment', 'advance', 'upfront payment', 'send money', 'transfer money',
            'upi', 'paytm', 'phonepe', 'googlepay', 'gpay', 'payment first', 'pay now',
            'bank transfer', 'wire transfer', 'deposit now', 'booking amount',

            # Tourism/Hotel - English
            'cheap hotel', 'hotel booking', 'cheap accommodation', 'discounted stay',
            'limited offer', 'book now', 'hurry', 'only few left', 'last rooms',
            'free trip', 'free stay', 'urgent booking', '70% off', '80% off', '90% off',
            'luxury resort', 'beachfront', 'sea view', 'private pool',

            # Urgency/Pressure
            'urgent', 'immediately', 'today only', 'expires today', 'last chance',
            'limited time', 'act now', 'don\'t miss', 'exclusive deal', 'special offer',

            # Investment Scams
            'guaranteed returns', 'double your money', 'triple your investment',
            'risk-free', 'no risk', '100% profit', 'passive income', 'work from home',
            'earn lakhs', 'earn crores', 'get rich quick', 'easy money',

            # Marketplace/Trade
            'cash on delivery not available', 'advance only', 'no cod',
            'original product', 'brand new', 'sealed pack', 'factory price',
            'wholesale price', 'dealer price', 'imported', 'usa imported',

            # Contact/Communication red flags
            'whatsapp only', 'call me', 'dm for details', 'inbox me',
            'telegram', 'chat now', 'message for price', 'serious buyers only',

            # Hindi (Devanagari)
            'पैसे भेजो', 'एडवांस', 'बुकिंग', 'सस्ता होटल', 'मुफ्त',
            'तुरंत', 'आज ही', 'गारंटीड', 'रिटर्न', 'पैसा कमाएं',

            # Marathi (Devanagari)
            'पैसे पाठवा', 'बुकिंग', 'स्वस्त', 'मोफत',

            # Romanized Hindi/Marathi
            'paise bhejo', 'booking karo', 'sasta hotel', 'muft',
            'guarantee', 'paisa kamao', 'jaldi karo',

            # Gambling
            'bet', 'betting', 'satta', 'matka', 'lottery', 'jackpot',
            'casino', 'poker', 'roulette', 'gambling', 'games', 'earn by playing',

            # Prostitution (subtle detection)
            'massage service', 'escort', 'female companion', 'full service',
            'call girl', 'vip service', 'private service', '24/7 available',

            # Fake documents
            'fake certificate', 'duplicate', 'passport', 'driving license',
            'aadhaar', 'pan card', 'marksheet', 'degree certificate',

            # Cryptocurrency scams
            'bitcoin', 'crypto', 'trading bot', 'forex', 'binary options',
            'mining', 'nft', 'web3', 'pump and dump',
        ]

    def _load_fraud_patterns(self) -> List[Dict]:
        """Load regex patterns for fraud detection"""
        return [
            {
                'name': 'phone_number_in_text',
                'pattern': r'\b\d{10}\b|\b\+91[\s-]?\d{10}\b',
                'weight': 0.2,
                'reason': 'Contains phone number (unusual for legitimate posts)'
            },
            {
                'name': 'multiple_payment_methods',
                'pattern': r'(upi|paytm|phonepe|googlepay|gpay|bhim)',
                'weight': 0.15,
                'reason': 'Mentions payment methods'
            },
            {
                'name': 'excessive_discounts',
                'pattern': r'([567890]\d%\s*(off|discount))|((off|discount)\s*[567890]\d%)',
                'weight': 0.25,
                'reason': 'Unrealistic discount (50%+ off)'
            },
            {
                'name': 'urgency_pressure',
                'pattern': r'(urgent|hurry|limited|today only|last chance|act now)',
                'weight': 0.2,
                'reason': 'Urgency/pressure tactics'
            },
            {
                'name': 'guaranteed_returns',
                'pattern': r'(guaranteed|100%|risk[- ]?free|double your money)',
                'weight': 0.3,
                'reason': 'Unrealistic guarantees'
            },
        ]

    async def analyze_text(self, text: str) -> Dict:
        """
        Analyze text for fraud indicators
        Returns:
            {
                'fraud_score': float (0.0 to 1.0),
                'risk_level': str ('HIGH', 'MEDIUM', 'LOW'),
                'fraud_type': str,
                'matched_keywords': [str],
                'matched_patterns': [str],
                'reasoning': str
            }
        """
        if not text or len(text.strip()) == 0:
            return {
                'fraud_score': 0.0,
                'risk_level': 'LOW',
                'fraud_type': 'none',
                'matched_keywords': [],
                'matched_patterns': [],
                'reasoning': 'No content to analyze'
            }

        text_lower = text.lower()

        # 1. Keyword matching
        matched_keywords = []
        for keyword in self.fraud_keywords:
            if keyword.lower() in text_lower:
                matched_keywords.append(keyword)

        keyword_score = min(len(matched_keywords) * 0.15, 0.6)  # Max 0.6 from keywords

        # 2. Pattern matching
        matched_patterns = []
        pattern_score = 0.0

        for pattern_dict in self.fraud_patterns:
            pattern = pattern_dict['pattern']
            if re.search(pattern, text_lower):
                matched_patterns.append(pattern_dict['name'])
                pattern_score += pattern_dict['weight']
                logger.debug(f"Pattern matched: {pattern_dict['name']} (+{pattern_dict['weight']})")

        pattern_score = min(pattern_score, 0.4)  # Max 0.4 from patterns

        # 3. Calculate final fraud score
        fraud_score = keyword_score + pattern_score
        fraud_score = min(fraud_score, 1.0)  # Cap at 1.0

        # 4. Determine risk level
        if fraud_score >= 0.7:
            risk_level = 'HIGH'
        elif fraud_score >= 0.4:
            risk_level = 'MEDIUM'
        else:
            risk_level = 'LOW'

        # 5. Classify fraud type
        fraud_type = self._classify_fraud_type(matched_keywords, text_lower)

        # 6. Generate reasoning
        reasoning = self._generate_reasoning(matched_keywords, matched_patterns, fraud_score)

        logger.info(f"Fraud analysis: Score={fraud_score:.3f}, Risk={risk_level}, Type={fraud_type}")
        logger.info(f"  Keywords: {len(matched_keywords)}, Patterns: {len(matched_patterns)}")

        return {
            'fraud_score': fraud_score,
            'risk_level': risk_level,
            'fraud_type': fraud_type,
            'matched_keywords': matched_keywords,
            'matched_patterns': matched_patterns,
            'reasoning': reasoning
        }

    def _classify_fraud_type(self, keywords: List[str], text: str) -> str:
        """Classify the type of fraud based on keywords and text"""
        keyword_str = ' '.join(keywords).lower()

        if any(k in keyword_str for k in ['hotel', 'booking', 'resort', 'stay', 'accommodation']):
            return 'hotel_booking_scam'
        elif any(k in keyword_str for k in ['investment', 'returns', 'profit', 'earn', 'income']):
            return 'investment_scam'
        elif any(k in keyword_str for k in ['lottery', 'jackpot', 'satta', 'bet', 'casino']):
            return 'gambling_scam'
        elif any(k in keyword_str for k in ['massage', 'escort', 'companion', 'service']):
            return 'prostitution_racket'
        elif any(k in keyword_str for k in ['certificate', 'passport', 'license', 'aadhaar', 'pan']):
            return 'fake_documents'
        elif any(k in keyword_str for k in ['bitcoin', 'crypto', 'forex', 'trading']):
            return 'cryptocurrency_scam'
        elif any(k in keyword_str for k in ['advance', 'payment', 'upi', 'transfer']):
            return 'advance_payment_fraud'
        else:
            return 'suspicious_content'

    def _generate_reasoning(self, keywords: List[str], patterns: List[str], score: float) -> str:
        """Generate human-readable reasoning for the fraud score"""
        parts = []

        if keywords:
            parts.append(f"Detected {len(keywords)} fraud keywords: {', '.join(keywords[:5])}")
            if len(keywords) > 5:
                parts[-1] += f" and {len(keywords)-5} more"

        if patterns:
            parts.append(f"Matched {len(patterns)} fraud patterns: {', '.join(patterns)}")

        if score >= 0.7:
            parts.append("HIGH confidence fraud detection")
        elif score >= 0.4:
            parts.append("Moderate fraud indicators present")
        else:
            parts.append("Low fraud probability")

        return '. '.join(parts) + '.'


# Test function
async def test_fraud_detector():
    """Test the fraud detector with sample texts"""
    detector = FraudDetector()

    test_cases = [
        "URGENT! Luxury beach resort in Anjuna. 70% OFF! Send advance payment via UPI. Limited slots!",
        "Planning a trip to Goa? Check out the official tourism website for verified hotels.",
        "Work from home opportunity! Earn ₹50,000 per month. Guaranteed returns. Message me for details.",
        "Fresh coconuts for sale. Contact for price.",
    ]

    print("\n" + "="*60)
    print("FRAUD DETECTOR TEST")
    print("="*60)

    for idx, text in enumerate(test_cases, 1):
        print(f"\nTest {idx}: {text}")
        result = await detector.analyze_text(text)
        print(f"  Score: {result['fraud_score']:.3f}")
        print(f"  Risk: {result['risk_level']}")
        print(f"  Type: {result['fraud_type']}")
        print(f"  Keywords: {len(result['matched_keywords'])}")
        print(f"  Patterns: {len(result['matched_patterns'])}")
        print(f"  Reasoning: {result['reasoning']}")

    print("\n" + "="*60)


if __name__ == "__main__":
    import asyncio
    logging.basicConfig(level=logging.INFO)
    asyncio.run(test_fraud_detector())
