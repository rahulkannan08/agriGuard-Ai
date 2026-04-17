# LLM Integration Brainstorm Document
## AgriVision - Context-Aware Recommendation System

---

## 1. LLM Provider Options

### Option A: NVIDIA NIM API (Recommended)
**API:** https://build.nvidia.com/
**Get Free API Key:** https://build.nvidia.com/explore/discover

**Models Available (Free Tier):**
| Model | Context | Speed | Quality |
|-------|---------|-------|---------|
| meta/llama-3.1-70b-instruct | 128K | Fast | Excellent |
| meta/llama-3.1-8b-instruct | 128K | Fastest | Good |
| meta/llama-3.2-3b-instruct | 128K | Very Fast | Good |
| mistralai/mixtral-8x7b-instruct-v0.1 | 32K | Fast | High |

**Pros:**
- Generous free tier (1000 requests/day)
- OpenAI-compatible API format
- Latest LLAMA 3.1/3.2 models
- Fast inference on NVIDIA infrastructure
- No credit card required

**Cons:**
- Rate limits on free tier
- Requires NVIDIA account

### Option B: Groq (Alternative)
**API:** https://console.groq.com/keys

**Pros:**
- Very fast inference
- Simple setup

**Cons:**
- Smaller context window (8K)
- Older LLAMA versions

### Option C: Ollama (Local Backup)
**For offline/demo backup**

```bash
ollama run llama3.1
```

**Pros:**
- No API limits
- Works offline
- Full control

**Cons:**
- Requires local GPU
- Setup complexity

### RECOMMENDATION: NVIDIA NIM API (llama-3.1-70b-instruct) with Ollama backup

---

## 2. NVIDIA NIM API Integration

### 2.1 Installation & Setup
```python
# Install OpenAI SDK (NVIDIA uses OpenAI-compatible API)
pip install openai

# Environment
NVIDIA_API_KEY=nvapi-your_api_key_here
```

### 2.2 Getting Your Free NVIDIA API Key
1. Go to https://build.nvidia.com/
2. Click "Sign In" (create free NVIDIA account if needed)
3. Browse to any model, e.g., https://build.nvidia.com/meta/llama-3_1-70b-instruct
4. Click "Get API Key" or "Build with this NIM"
5. Copy your API key (starts with `nvapi-`)

### 2.3 Basic Client Setup
```python
from openai import OpenAI
import os

class LLMService:
    def __init__(self):
        self.client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=os.environ.get("NVIDIA_API_KEY")
        )
        self.model = "meta/llama-3.1-70b-instruct"

    def generate(self, prompt: str, max_tokens: int = 1024) -> str:
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": self._get_system_prompt()
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=max_tokens,
                temperature=0.7,
                top_p=0.9
            )
            return response.choices[0].message.content
        except Exception as e:
            return self._fallback_response(str(e))

    def _get_system_prompt(self):
        return SYSTEM_PROMPT  # Defined in section 3.1

    def _fallback_response(self, error: str):
        return f"Error generating response: {error}"
```

### 2.4 Alternative: Streaming Response
```python
def generate_stream(self, prompt: str) -> str:
    """Generate response with streaming for better UX."""
    full_response = ""

    stream = self.client.chat.completions.create(
        model=self.model,
        messages=[
            {"role": "system", "content": self._get_system_prompt()},
            {"role": "user", "content": prompt}
        ],
        max_tokens=1024,
        temperature=0.7,
        stream=True
    )

    for chunk in stream:
        if chunk.choices[0].delta.content:
            full_response += chunk.choices[0].delta.content

    return full_response
```

### 2.5 Model Selection Guide
```python
# For production (best quality)
MODEL_PRODUCTION = "meta/llama-3.1-70b-instruct"

# For faster responses (good quality)
MODEL_FAST = "meta/llama-3.1-8b-instruct"

# For very fast responses (acceptable quality)
MODEL_ULTRAFAST = "meta/llama-3.2-3b-instruct"

# Usage based on scenario
def get_model_for_scenario(confidence: float) -> str:
    """Select model based on prediction confidence."""
    if confidence >= 0.9:
        # High confidence - use faster model
        return MODEL_FAST
    else:
        # Lower confidence - use best model for detailed analysis
        return MODEL_PRODUCTION
```

---

## 3. Prompt Engineering Strategy

### 3.1 System Prompt
```python
SYSTEM_PROMPT = """You are AgriVision AI, an expert agricultural advisor specializing in crop disease management for Indian farms. You provide practical, actionable recommendations for farmers and agronomists.

Your expertise covers:
- Tomato, Apple, and Grape crop diseases
- Organic and chemical treatment options
- Region-specific agricultural practices in India
- Seasonal and weather-based recommendations

Guidelines:
1. Always provide both organic AND chemical treatment options
2. Consider the Indian agricultural context (monsoons, local availability)
3. Include time-to-recovery estimates
4. Mention preventive measures for future
5. Be concise but comprehensive
6. Format responses with clear sections
7. Use simple language that farmers can understand

DO NOT:
- Recommend branded pesticides (use generic names)
- Provide medical advice if disease affects humans
- Make claims about guaranteed results"""
```

### 3.2 User Prompt Template
```python
def build_prompt(
    crop: str,
    disease: str,
    confidence: float,
    severity: str,
    location: dict = None,
    time_context: str = None
) -> str:
    """
    Build context-aware prompt for LLM.
    """
    prompt = f"""A {crop} crop has been diagnosed with {disease}.

Detection Details:
- Confidence: {confidence:.1%}
- Severity Level: {severity}
"""

    if location:
        prompt += f"""
Location Context:
- Region: {location.get('region', 'Unknown')}
- State: {location.get('state', 'Unknown')}
- Latitude: {location.get('latitude', 'N/A')}
- Longitude: {location.get('longitude', 'N/A')}
"""

    if time_context:
        prompt += f"""
Time Context:
- Current Time: {time_context}
- Season: {get_current_season()}
"""

    prompt += """
Please provide:
1. IMMEDIATE ACTIONS (what to do right now)
2. ORGANIC TREATMENT OPTIONS (natural remedies)
3. CHEMICAL TREATMENT OPTIONS (pesticides/fungicides)
4. ESTIMATED RECOVERY TIME
5. PREVENTIVE MEASURES (to avoid recurrence)

Format each section clearly with headers."""

    return prompt
```

### 3.3 Context Variables

| Variable | Source | Example |
|----------|--------|---------|
| crop | Model prediction | "Tomato" |
| disease | Model prediction | "Early Blight" |
| confidence | Model output | 0.94 |
| severity | Calculated | "Moderate" |
| latitude | EXIF GPS | 12.9141 |
| longitude | EXIF GPS | 74.8560 |
| region | GPS lookup | "Mangalore, Karnataka" |
| time | System time | "6:30 AM" |
| season | Calculated | "Pre-monsoon" |
| humidity | Weather API (optional) | "85%" |

---

## 4. Response Parsing

### 4.1 Structured Response Format
```python
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class TreatmentRecommendation:
    immediate_actions: List[str]
    organic_treatments: List[str]
    chemical_treatments: List[str]
    recovery_time: str
    preventive_measures: List[str]
    weather_advisory: Optional[str] = None
    confidence_note: Optional[str] = None

def parse_llm_response(response: str) -> TreatmentRecommendation:
    """
    Parse LLM response into structured format.
    """
    sections = {
        'immediate': [],
        'organic': [],
        'chemical': [],
        'recovery': '',
        'preventive': []
    }

    current_section = None
    lines = response.strip().split('\n')

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Detect section headers
        lower = line.lower()
        if 'immediate' in lower:
            current_section = 'immediate'
        elif 'organic' in lower:
            current_section = 'organic'
        elif 'chemical' in lower:
            current_section = 'chemical'
        elif 'recovery' in lower:
            current_section = 'recovery'
        elif 'prevent' in lower:
            current_section = 'preventive'
        elif current_section and line.startswith(('-', '•', '*', '1', '2', '3', '4', '5')):
            # Remove bullet/number prefix
            content = line.lstrip('-•* 0123456789.)')
            if current_section == 'recovery':
                sections['recovery'] = content
            else:
                sections[current_section].append(content)

    return TreatmentRecommendation(
        immediate_actions=sections['immediate'],
        organic_treatments=sections['organic'],
        chemical_treatments=sections['chemical'],
        recovery_time=sections['recovery'],
        preventive_measures=sections['preventive']
    )
```

### 4.2 JSON Output Mode
```python
def build_json_prompt(context: dict) -> str:
    """
    Prompt that requests JSON output directly.
    """
    return f"""Analyze this crop disease and provide recommendations in JSON format.

Context:
{json.dumps(context, indent=2)}

Return a JSON object with this exact structure:
{{
    "summary": "Brief 1-sentence diagnosis summary",
    "immediate_actions": ["action1", "action2", "action3"],
    "organic_treatment": [
        {{"method": "name", "application": "how to apply", "frequency": "how often"}}
    ],
    "chemical_treatment": [
        {{"name": "generic name", "dosage": "amount", "precautions": "safety notes"}}
    ],
    "recovery_time": "X-Y days/weeks",
    "preventive_measures": ["measure1", "measure2"],
    "weather_advisory": "any weather-related concerns or null"
}}

Return ONLY the JSON object, no additional text."""
```

---

## 5. Disease-Specific Prompts

### 5.1 Prompt Templates by Disease Category

```python
DISEASE_CONTEXT = {
    # Bacterial diseases
    "Bacterial_spot": {
        "type": "bacterial",
        "spreads_by": "water splash, contaminated tools",
        "favorable_conditions": "warm, humid weather",
        "urgency": "high"
    },

    # Fungal diseases
    "Early_blight": {
        "type": "fungal",
        "spreads_by": "wind, rain, infected debris",
        "favorable_conditions": "alternating wet-dry conditions",
        "urgency": "medium"
    },
    "Late_blight": {
        "type": "fungal",
        "spreads_by": "wind-blown spores",
        "favorable_conditions": "cool, wet weather",
        "urgency": "critical"
    },
    "Black_rot": {
        "type": "fungal",
        "spreads_by": "rain, insects",
        "favorable_conditions": "warm, humid weather",
        "urgency": "high"
    },

    # Viral diseases
    "Tomato_Yellow_Leaf_Curl_Virus": {
        "type": "viral",
        "spreads_by": "whitefly vector",
        "favorable_conditions": "warm, dry conditions",
        "urgency": "critical"
    },
    "Tomato_mosaic_virus": {
        "type": "viral",
        "spreads_by": "contact, contaminated tools",
        "favorable_conditions": "any",
        "urgency": "high"
    },

    # Pest-related
    "Spider_mites": {
        "type": "pest",
        "spreads_by": "wind, contact",
        "favorable_conditions": "hot, dry conditions",
        "urgency": "medium"
    }
}

def enrich_prompt_with_disease_context(base_prompt: str, disease: str) -> str:
    """Add disease-specific context to the prompt."""
    context = DISEASE_CONTEXT.get(disease, {})
    if context:
        enrichment = f"""
Disease Characteristics:
- Type: {context.get('type', 'unknown')}
- Primary spread method: {context.get('spreads_by', 'various')}
- Favorable conditions: {context.get('favorable_conditions', 'various')}
- Urgency level: {context.get('urgency', 'standard')}
"""
        return base_prompt + enrichment
    return base_prompt
```

### 5.2 Location-Aware Prompts

```python
INDIA_REGIONS = {
    "Karnataka": {
        "climate": "tropical",
        "monsoon": "June-September",
        "major_crops": ["tomato", "grape"],
        "considerations": "High humidity during monsoon increases fungal risk"
    },
    "Maharashtra": {
        "climate": "semi-arid to humid",
        "monsoon": "June-September",
        "major_crops": ["grape", "tomato"],
        "considerations": "Nashik region: grape belt, watch for downy mildew"
    },
    "Himachal Pradesh": {
        "climate": "temperate",
        "monsoon": "July-September",
        "major_crops": ["apple"],
        "considerations": "Cool climate favors certain apple diseases"
    },
    "Kashmir": {
        "climate": "temperate",
        "monsoon": "July-September",
        "major_crops": ["apple"],
        "considerations": "Cold winters, short growing season"
    }
}

def add_regional_context(prompt: str, latitude: float, longitude: float) -> str:
    """Add region-specific agricultural context."""
    region = get_region_from_coords(latitude, longitude)
    regional_info = INDIA_REGIONS.get(region, {})

    if regional_info:
        context = f"""
Regional Agricultural Context ({region}):
- Climate zone: {regional_info.get('climate')}
- Monsoon period: {regional_info.get('monsoon')}
- Special considerations: {regional_info.get('considerations')}
"""
        return prompt + context
    return prompt
```

---

## 6. Sample Prompt-Response Pairs

### 6.1 Example: Tomato Early Blight

**Input Prompt:**
```
A Tomato crop has been diagnosed with Early Blight.

Detection Details:
- Confidence: 94%
- Severity Level: Moderate

Location Context:
- Region: Mangalore, Karnataka
- Climate: Tropical, pre-monsoon
- Current humidity: High (85%)

Time Context:
- Current Time: 6:30 AM
- Season: Pre-monsoon (April)

Please provide comprehensive treatment recommendations.
```

**Expected Response:**
```
## DIAGNOSIS SUMMARY
Early Blight (Alternaria solani) detected with high confidence. Moderate severity suggests established infection requiring prompt action.

## IMMEDIATE ACTIONS
1. Remove and destroy all visibly infected leaves immediately
2. Avoid overhead irrigation - water at soil level only
3. Increase plant spacing if possible to improve air circulation
4. Do not work with plants when foliage is wet

## ORGANIC TREATMENT OPTIONS
1. **Neem Oil Spray**: Mix 5ml neem oil per liter of water + few drops liquid soap. Apply every 7 days, preferably early morning (current 6:30 AM is ideal).

2. **Copper-based Organic Fungicide**: Bordeaux mixture (1% concentration). Safe for organic farming, apply every 10-14 days.

3. **Baking Soda Solution**: 1 tablespoon per gallon of water + few drops dish soap. Mild preventive measure.

## CHEMICAL TREATMENT OPTIONS
1. **Chlorothalonil**: Apply at 2g/liter. Effective contact fungicide.
2. **Mancozeb**: 2.5g/liter as protective spray.
3. **Azoxystrobin**: Systemic fungicide, 1ml/liter, rotation recommended.

⚠️ Apply in early morning (6-8 AM) for best absorption. Pre-monsoon humidity in Karnataka means quick reapplication may be needed if rain occurs.

## ESTIMATED RECOVERY TIME
With immediate intervention: 14-21 days for visible improvement.
Full recovery: 4-6 weeks with consistent treatment.

## PREVENTIVE MEASURES
1. Crop rotation - avoid tomatoes in same plot for 2 years
2. Use disease-resistant varieties (check with local agricultural office)
3. Mulch around plants to prevent soil splash
4. Remove plant debris after harvest
5. Weekly monitoring during monsoon season

## WEATHER ADVISORY
Pre-monsoon conditions in Karnataka increase disease pressure. Expect rain within coming weeks - apply protective fungicide before monsoon onset. High humidity (85%) favors fungal spread; prioritize air circulation.
```

### 6.2 Example: Low Confidence Handling

**Input (Low Confidence):**
```
Confidence: 58%
Severity: Unknown
Disease: Possible Septoria Leaf Spot
```

**Response:**
```
## IMPORTANT NOTICE
The detection confidence is below our reliability threshold (58% vs 60% minimum). The following recommendations are provisional.

## RECOMMENDED NEXT STEPS
1. **Capture a clearer image** - ensure good lighting and focus on a clearly affected leaf
2. **Consult with local agricultural extension officer** for physical diagnosis
3. **General protective measures** while awaiting confirmation:
   - Reduce watering frequency
   - Improve air circulation
   - Remove obviously damaged leaves
   - Apply general-purpose organic fungicide (neem oil)

⚠️ Do not apply chemical treatments without confirmed diagnosis to avoid unnecessary chemical use and resistance development.
```

---

## 7. Error Handling & Fallbacks

### 7.1 Fallback Response System
```python
FALLBACK_RESPONSES = {
    "api_error": """
Unable to generate AI recommendations at this time.

General guidance for {disease} on {crop}:
1. Remove visibly infected plant parts
2. Improve air circulation around plants
3. Avoid overhead watering
4. Consider consulting local agricultural extension services

For detailed treatment, please try again or contact an agronomist.
""",
    "rate_limit": """
Our AI service is temporarily busy. General recommendations:
1. Document the infection with photos
2. Isolate affected plants if possible
3. Apply basic organic fungicide (neem oil)
4. Consult local agricultural experts

Please retry in a few minutes for detailed AI analysis.
""",
    "unknown_disease": """
The detected condition doesn't match our database.

Recommended actions:
1. Take multiple photos from different angles
2. Note any unusual symptoms (smell, texture, pattern)
3. Contact local agricultural extension office
4. Preserve a sample in a sealed bag if condition worsens
"""
}

def get_fallback_response(error_type: str, context: dict) -> str:
    """Return appropriate fallback when LLM fails."""
    template = FALLBACK_RESPONSES.get(error_type, FALLBACK_RESPONSES["api_error"])
    return template.format(**context)
```

### 7.2 Response Validation
```python
def validate_llm_response(response: str) -> tuple[bool, list]:
    """
    Validate that LLM response contains required sections.
    """
    required_sections = [
        'immediate',
        'organic',
        'chemical',
        'recovery',
        'prevent'
    ]

    missing = []
    response_lower = response.lower()

    for section in required_sections:
        if section not in response_lower:
            missing.append(section)

    is_valid = len(missing) == 0
    return is_valid, missing
```

### 7.3 Retry Logic
```python
import time
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10)
)
def generate_with_retry(prompt: str) -> str:
    """Generate LLM response with automatic retry."""
    return llm_service.generate(prompt)
```

---

## 8. Caching Strategy

### 8.1 Response Caching
```python
from functools import lru_cache
import hashlib

@lru_cache(maxsize=100)
def get_cached_recommendation(cache_key: str) -> str:
    """
    Cache recommendations for identical disease+location combos.
    """
    return cached_responses.get(cache_key)

def build_cache_key(crop: str, disease: str, region: str) -> str:
    """Create deterministic cache key."""
    key_string = f"{crop}:{disease}:{region}"
    return hashlib.md5(key_string.encode()).hexdigest()
```

### 8.2 Pre-generated Templates
```python
# For common cases, pre-generate responses during low-traffic
PRE_GENERATED = {
    ("Tomato", "Early_blight", "Karnataka"): "...",
    ("Tomato", "Late_blight", "Maharashtra"): "...",
    ("Apple", "Apple_scab", "Himachal"): "...",
    # etc.
}
```

---

## 9. Testing & Evaluation

### 9.1 Prompt Test Cases
```python
TEST_CASES = [
    {
        "name": "High confidence tomato disease",
        "input": {
            "crop": "Tomato",
            "disease": "Early Blight",
            "confidence": 0.94,
            "severity": "moderate"
        },
        "expected_sections": ["immediate", "organic", "chemical", "recovery", "preventive"]
    },
    {
        "name": "Low confidence - should warn",
        "input": {
            "crop": "Grape",
            "disease": "Black Rot",
            "confidence": 0.55,
            "severity": "unknown"
        },
        "expected_contains": ["confidence", "unclear", "retry", "consult"]
    },
    {
        "name": "Healthy plant",
        "input": {
            "crop": "Apple",
            "disease": "healthy",
            "confidence": 0.98,
            "severity": "none"
        },
        "expected_contains": ["healthy", "preventive", "maintain"]
    }
]
```

### 9.2 Response Quality Metrics
```python
def evaluate_response_quality(response: str, expected: dict) -> dict:
    """
    Evaluate LLM response quality.
    """
    metrics = {
        "has_all_sections": True,
        "appropriate_length": 200 < len(response) < 3000,
        "actionable": contains_action_words(response),
        "specific": not contains_vague_language(response),
        "safe": not contains_harmful_advice(response)
    }

    # Check for required sections
    for section in expected.get("expected_sections", []):
        if section.lower() not in response.lower():
            metrics["has_all_sections"] = False
            break

    return metrics
```

---

## 10. Integration Code Summary

### 10.1 Complete LLM Service Class (NVIDIA NIM API)
```python
from openai import OpenAI
from dataclasses import dataclass
from typing import Optional, Dict, List
import os
import json

@dataclass
class RecommendationResult:
    success: bool
    summary: str
    immediate_actions: List[str]
    organic_treatment: List[Dict]
    chemical_treatment: List[Dict]
    recovery_time: str
    preventive_measures: List[str]
    weather_advisory: Optional[str]
    raw_response: str

class AgriVisionLLM:
    def __init__(self):
        self.client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=os.environ.get("NVIDIA_API_KEY")
        )
        self.model = "meta/llama-3.1-70b-instruct"

    def get_recommendations(
        self,
        crop: str,
        disease: str,
        confidence: float,
        severity: str,
        location: Optional[Dict] = None
    ) -> RecommendationResult:
        """
        Generate disease recommendations using NVIDIA NIM API.
        """
        # Build context-aware prompt
        prompt = self._build_prompt(crop, disease, confidence, severity, location)

        # Generate response
        try:
            response = self._call_llm(prompt)
            parsed = self._parse_response(response)
            return RecommendationResult(success=True, **parsed, raw_response=response)
        except Exception as e:
            fallback = self._get_fallback(crop, disease, str(e))
            return RecommendationResult(
                success=False,
                summary=f"AI service unavailable: {str(e)}",
                immediate_actions=fallback["immediate"],
                organic_treatment=[],
                chemical_treatment=[],
                recovery_time="Consult local expert",
                preventive_measures=fallback["preventive"],
                weather_advisory=None,
                raw_response=""
            )

    def _build_prompt(self, crop, disease, confidence, severity, location):
        # Implementation from section 3.2
        pass

    def _call_llm(self, prompt: str) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1024,
            temperature=0.7,
            top_p=0.9
        )
        return response.choices[0].message.content

    def _parse_response(self, response: str) -> Dict:
        # Implementation from section 4.1
        pass

    def _get_fallback(self, crop: str, disease: str, error: str) -> Dict:
        # Implementation from section 7.1
        pass
```

---

## 11. Checklist

### LLM Integration Checklist
- [ ] NVIDIA API key obtained from https://build.nvidia.com/
- [ ] API key configured in .env as NVIDIA_API_KEY
- [ ] OpenAI SDK installed (`pip install openai`)
- [ ] System prompt finalized
- [ ] User prompt template complete
- [ ] Response parsing implemented
- [ ] Error handling complete
- [ ] Fallback responses prepared
- [ ] Caching implemented (optional)
- [ ] Test cases passing
- [ ] Integration with backend complete
- [ ] Response displayed in frontend

---

## 12. Quick Reference

### API Endpoint
```
Base URL: https://integrate.api.nvidia.com/v1
```

### Available Models (Free Tier)
```python
MODELS = {
    "llama-3.1-70b": "meta/llama-3.1-70b-instruct",  # Best quality
    "llama-3.1-8b": "meta/llama-3.1-8b-instruct",    # Balanced
    "llama-3.2-3b": "meta/llama-3.2-3b-instruct",    # Fastest
    "mixtral-8x7b": "mistralai/mixtral-8x7b-instruct-v0.1"  # Alternative
}
```

### Sample cURL Test
```bash
curl https://integrate.api.nvidia.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NVIDIA_API_KEY" \
  -d '{
    "model": "meta/llama-3.1-70b-instruct",
    "messages": [{"role": "user", "content": "What causes tomato early blight?"}],
    "max_tokens": 512
  }'
```

### Rate Limits (Free Tier)
- 1000 requests/day
- 10 requests/minute
- Sufficient for hackathon demo

---

*LLM Integration Brainstorm - AgriVision Team (Updated for NVIDIA NIM API)*
