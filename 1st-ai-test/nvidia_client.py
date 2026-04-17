from __future__ import annotations

import json
import os
import re
import time
from typing import Any, Dict, List

import requests
from dotenv import load_dotenv

from config import DEFAULT_NVIDIA_BASE_URL, DEFAULT_NVIDIA_MODEL

load_dotenv()

SYSTEM_PROMPT = """You are AgriVisionAI, an advanced agronomy decision-support assistant specializing in crop disease management.
You support 40+ crops worldwide: vegetables, fruits, grains, beverages, herbs, and specialty crops.
Return only valid JSON with ALL these fields:
summary, immediate_actions, organic_treatment, chemical_treatment,
recovery_estimate, preventive_measures, monitoring_checklist, safety_note.

CRITICAL REQUIREMENTS:
- SUMMARY: 2-3 sentence professional diagnosis and action level
- IMMEDIATE_ACTIONS: List 4-5 urgent steps to take within 24-48 hours
- ORGANIC_TREATMENT: List 3-4 eco-friendly treatment options with application timing & regional availability
- CHEMICAL_TREATMENT: List 2-3 approved fungicides/insecticides/pesticides with dosage & safety info
- RECOVERY_ESTIMATE: Include timeframe (days/weeks/months) and recovery percentage under optimal conditions
- PREVENTIVE_MEASURES: List 4-5 practices to prevent recurrence (crop-specific)
- MONITORING_CHECKLIST: List 3-4 specific symptoms to track daily/weekly
- SAFETY_NOTE: PPE requirements, phytotoxicity warnings, regional label compliance, environmental impact

Rules:
- Support ALL crop types: vegetables, fruits, grains, herbs, specialty crops
- If confidence < 0.60, prioritize safe interim actions over aggressive treatment
- Include both organic and chemical options for all cases
- Use location, weather, and time context for region-specific recommendations
- Be specific with product names, timings, dosages, and crop-specific details
- Always include safety, environmental, and regulatory compliance considerations
- Adapt recommendations for both small-scale farmers and commercial operations
"""

IMAGE_VALIDATION_PROMPT = """You are an expert crop disease image analyst. Analyze this plant/leaf image and validate:
1. Is this clearly a plant leaf/crop part? (yes/no)
2. Is the image quality good enough for disease diagnosis? (yes/no)
3. What is the most likely crop/plant leaf name? (free text, use common crop names from worldwide data)
4. Is there visible disease or damage? (healthy/diseased)
5. Confidence level for analysis (0.0-1.0)

Return JSON: {"is_leaf": bool, "quality_good": bool, "estimated_crop": str, "disease_visible": bool, "confidence": float, "reason": str}
"""

UNKNOWN_PLANT_DISEASE_PROMPT = """You are an expert plant pathologist.
The ML model could not confidently classify this image from its dataset.
Identify the most likely plant and disease directly from this image.
Use worldwide/global crop disease knowledge across regions and climates.
Return corrected common names when possible.

Return strict JSON only:
{
    "crop": "Plant name or Unknown",
    "disease": "Disease name or Healthy or Unknown",
    "confidence": 0.0,
    "reason": "Short reason for your estimate"
}

Rules:
- Use confidence between 0.0 and 1.0
- If uncertain, keep crop/disease as Unknown
- Keep reason concise
"""

LEAF_INFO_PROMPT = """You are an expert botanist and plant pathologist.
Analyze this leaf image and identify detailed leaf info using worldwide crop data.

Return strict JSON only:
{
    "leaf_name": "Leaf common name or Unknown",
    "crop": "Crop/plant name or Unknown",
    "disease": "Disease name or Healthy or Unknown",
    "health_status": "healthy|diseased|uncertain",
    "confidence": 0.0,
    "key_observations": ["observation1", "observation2"],
    "reasoning": "Short explanation"
}

Rules:
- Use worldwide knowledge and common names.
- Keep confidence between 0.0 and 1.0.
- If uncertain, use Unknown.
- Keep reasoning short.
"""

REQUIRED_KEYS = [
    "summary",
    "immediate_actions",
    "organic_treatment",
    "chemical_treatment",
    "recovery_estimate",
    "preventive_measures",
    "monitoring_checklist",
    "safety_note",
]


def _leaf_info_fallback(reason: str = "leaf_info_unavailable") -> Dict[str, Any]:
    return {
        "leaf_name": "Unknown",
        "crop": "Unknown",
        "disease": "Unknown",
        "health_status": "uncertain",
        "confidence": 0.0,
        "key_observations": [],
        "reasoning": reason,
        "source": "fallback",
    }


def _normalize_leaf_info_payload(parsed: Dict[str, Any], source: str) -> Dict[str, Any]:
    leaf_name = str(parsed.get("leaf_name", parsed.get("crop", "Unknown")) or "Unknown").strip() or "Unknown"
    crop = str(parsed.get("crop", "Unknown") or "Unknown").strip() or "Unknown"
    disease = str(parsed.get("disease", "Unknown") or "Unknown").strip() or "Unknown"
    health_status = str(parsed.get("health_status", "uncertain") or "uncertain").strip().lower()

    if health_status not in {"healthy", "diseased", "uncertain"}:
        health_status = "uncertain"

    try:
        confidence = float(parsed.get("confidence", 0.0) or 0.0)
    except Exception:
        confidence = 0.0
    confidence = max(0.0, min(1.0, confidence))

    raw_obs = parsed.get("key_observations", [])
    key_observations: List[str] = []
    if isinstance(raw_obs, list):
        for item in raw_obs:
            text = str(item).strip()
            if text:
                key_observations.append(text)

    reasoning = str(parsed.get("reasoning", parsed.get("reason", "")) or "").strip()

    return {
        "leaf_name": leaf_name,
        "crop": crop,
        "disease": disease,
        "health_status": health_status,
        "confidence": confidence,
        "key_observations": key_observations,
        "reasoning": reasoning,
        "source": source,
    }


def _collect_gemini_keys() -> List[str]:
    raw_keys = [
        os.getenv("GEMINI_API_KEY", ""),
        os.getenv("GEMINI_API_KEY_1", ""),
        os.getenv("GEMINI_API_KEY_2", ""),
    ]

    extra = os.getenv("GEMINI_API_KEYS", "")
    if extra:
        raw_keys.extend(part.strip() for part in extra.split(","))

    seen = set()
    keys: List[str] = []
    for key in raw_keys:
        token = key.strip()
        if not token or token in seen:
            continue
        seen.add(token)
        keys.append(token)

    return keys


def _collect_gemini_models() -> List[str]:
    configured = os.getenv("GEMINI_MODEL", "").strip()

    raw_models = [
        configured,
        f"{configured}-latest" if configured and "latest" not in configured else "",
        "gemini-2.5-flash-latest",
        "gemini-2.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash",
    ]

    seen = set()
    models: List[str] = []
    for model in raw_models:
        name = model.strip()
        if not name or name in seen:
            continue
        seen.add(name)
        models.append(name)

    return models


def _extract_gemini_text(response_data: Dict[str, Any]) -> str:
    parts = (
        response_data.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [])
    )
    return "".join(part.get("text", "") for part in parts).strip()


def _call_gemini_vision_json(
    prompt: str,
    image_base64: str,
    timeout_seconds: int,
    max_output_tokens: int,
) -> Dict[str, Any] | None:
    gemini_keys = _collect_gemini_keys()
    gemini_models = _collect_gemini_models()[:3]

    if not gemini_keys or not gemini_models:
        return None

    start_time = time.monotonic()
    attempts = 0
    max_attempts = 6

    for key in gemini_keys:
        for model in gemini_models:
            if attempts >= max_attempts:
                return None

            elapsed = time.monotonic() - start_time
            if elapsed >= timeout_seconds:
                return None

            gemini_url = (
                f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"{model}:generateContent?key={key}"
            )

            generation_configs: List[Dict[str, Any]] = [
                {
                    "temperature": 0.2,
                    "maxOutputTokens": max_output_tokens,
                    "responseMimeType": "application/json",
                    "thinkingConfig": {
                        "thinkingBudget": 0,
                    },
                },
                {
                    "temperature": 0.2,
                    "maxOutputTokens": max_output_tokens,
                },
            ]

            for generation_config in generation_configs:
                if attempts >= max_attempts:
                    return None

                elapsed = time.monotonic() - start_time
                if elapsed >= timeout_seconds:
                    return None

                payload = {
                    "contents": [
                        {
                            "role": "user",
                            "parts": [
                                {"text": prompt},
                                {
                                    "inline_data": {
                                        "mime_type": "image/jpeg",
                                        "data": image_base64,
                                    }
                                },
                            ],
                        }
                    ],
                    "generationConfig": generation_config,
                }

                try:
                    attempts += 1
                    remaining_budget = max(1.0, timeout_seconds - (time.monotonic() - start_time))
                    request_timeout = min(6.0, remaining_budget)

                    gemini_response = requests.post(
                        gemini_url,
                        headers={"Content-Type": "application/json"},
                        json=payload,
                        timeout=request_timeout,
                    )

                    if gemini_response.status_code >= 400:
                        continue

                    gemini_data = gemini_response.json()
                    text = _extract_gemini_text(gemini_data)
                    if not text:
                        continue

                    parsed = _extract_json_from_text(text)
                    return parsed
                except Exception:
                    continue

    return None


def _normalize_validation_payload(parsed: Dict[str, Any]) -> Dict[str, Any]:
    def to_bool(value: Any, default: bool) -> bool:
        if isinstance(value, bool):
            return value
        if value is None:
            return default
        text = str(value).strip().lower()
        if text in {"yes", "true", "1"}:
            return True
        if text in {"no", "false", "0"}:
            return False
        return default

    try:
        confidence = float(parsed.get("confidence", 0.5) or 0.5)
    except Exception:
        confidence = 0.5
    confidence = max(0.0, min(1.0, confidence))

    return {
        "is_leaf": to_bool(parsed.get("is_leaf"), True),
        "quality_good": to_bool(parsed.get("quality_good"), True),
        "estimated_crop": str(parsed.get("estimated_crop", "Unknown") or "Unknown").strip() or "Unknown",
        "disease_visible": to_bool(parsed.get("disease_visible"), True),
        "confidence": confidence,
        "reason": str(parsed.get("reason", "") or "").strip(),
    }


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _extract_json_from_text(text: str) -> Dict[str, Any]:
    text = text.strip()
    try:
        obj = json.loads(text)
        if isinstance(obj, dict):
            return obj
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        raise ValueError("No JSON object found in LLM response")

    obj = json.loads(match.group(0))
    if not isinstance(obj, dict):
        raise ValueError("Parsed JSON is not an object")
    return obj


def _build_user_prompt(context: Dict[str, Any]) -> str:
    return (
        "Generate recommendation JSON for crop disease case with this input:\n"
        f"crop: {context.get('crop', 'Unknown')}\n"
        f"disease: {context.get('disease', 'Unknown')}\n"
        f"confidence: {context.get('confidence', 0.0)}\n"
        f"location: {context.get('location', 'Unknown')}\n"
        f"time_context: {context.get('time_context', 'Unknown')}\n"
        f"weather: {context.get('weather', 'Unknown')}\n"
        f"decision: {context.get('decision', 'monitor')}\n"
    )


def _fallback_recommendation(context: Dict[str, Any], reason: str) -> Dict[str, Any]:
    decision = context.get("decision", "monitor")
    confidence = float(context.get("confidence", 0.0))

    if decision == "recapture" or confidence < 0.60:
        return {
            "summary": "Image quality or confidence is too low for reliable treatment advice.",
            "immediate_actions": [
                "Capture a clearer leaf photo in natural light.",
                "Take close-up images of both sides of the leaf.",
                "Avoid immediate chemical spraying until confirmation.",
            ],
            "organic_treatment": ["Use general plant hygiene and remove severely damaged leaves."],
            "chemical_treatment": ["Wait for confirmed diagnosis before chemical application."],
            "recovery_estimate": "Re-evaluate after recapture",
            "preventive_measures": [
                "Maintain field sanitation.",
                "Inspect nearby plants daily for symptom spread.",
            ],
            "monitoring_checklist": [
                "Check for new spots, wilting, or curling over 24-48 hours."
            ],
            "safety_note": f"Fallback used ({reason}). Follow local agronomy guidance before spraying.",
        }

    return {
        "summary": "Provisional recommendation generated from fallback logic.",
        "immediate_actions": [
            "Isolate visibly affected leaves/plants.",
            "Improve air circulation and avoid overhead watering.",
            "Continue monitoring symptom progression daily.",
        ],
        "organic_treatment": ["Apply neem-based spray during early morning if conditions are dry."],
        "chemical_treatment": [
            "Use label-approved crop-specific fungicide/insecticide only after local verification."
        ],
        "recovery_estimate": "7-21 days based on severity and response",
        "preventive_measures": [
            "Sanitize tools after field use.",
            "Remove heavily infected debris from field.",
        ],
        "monitoring_checklist": [
            "Track spread rate and re-capture image if symptoms worsen."
        ],
        "safety_note": f"Fallback used ({reason}). Wear PPE for any spray operation.",
    }


def _normalize_recommendation(data: Dict[str, Any], fallback: Dict[str, Any]) -> Dict[str, Any]:
    normalized: Dict[str, Any] = {}
    for key in REQUIRED_KEYS:
        normalized[key] = data.get(key, fallback[key])

    for list_key in [
        "immediate_actions",
        "organic_treatment",
        "chemical_treatment",
        "preventive_measures",
        "monitoring_checklist",
    ]:
        if not isinstance(normalized[list_key], list):
            normalized[list_key] = fallback[list_key]

    return normalized


def _extract_stream_content(response: requests.Response) -> str:
    chunks: List[str] = []

    for raw_line in response.iter_lines(decode_unicode=True):
        if not raw_line:
            continue

        line = raw_line.strip()
        if not line.startswith("data:"):
            continue

        payload = line[len("data:") :].strip()
        if payload == "[DONE]":
            break

        try:
            event = json.loads(payload)
        except json.JSONDecodeError:
            continue

        choices = event.get("choices", [])
        if not choices:
            continue

        delta = choices[0].get("delta", {})
        piece = delta.get("content", "")
        if piece:
            chunks.append(piece)

    return "".join(chunks)


def call_nvidia_llm(context_dict: Dict[str, Any], timeout_seconds: int = 25) -> Dict[str, Any]:
    api_key = os.getenv("NVIDIA_API_KEY", "").strip()
    model_name = os.getenv("NVIDIA_MODEL", DEFAULT_NVIDIA_MODEL)
    base_url = os.getenv("NVIDIA_API_BASE_URL", DEFAULT_NVIDIA_BASE_URL).rstrip("/")
    stream = _env_bool("NVIDIA_STREAM", False)
    reasoning_effort = os.getenv("NVIDIA_REASONING_EFFORT", "high")
    max_tokens = int(os.getenv("NVIDIA_MAX_TOKENS", "1200"))
    temperature = float(os.getenv("NVIDIA_TEMPERATURE", "0.10"))
    top_p = float(os.getenv("NVIDIA_TOP_P", "1.00"))

    fallback = _fallback_recommendation(context_dict, reason="nvidia_api_unavailable")

    if not api_key:
        return fallback

    url = f"{base_url}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "text/event-stream" if stream else "application/json",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model_name,
        "reasoning_effort": reasoning_effort,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": _build_user_prompt(context_dict)},
        ],
        "max_tokens": max_tokens,
        "temperature": temperature,
        "top_p": top_p,
        "stream": stream,
    }

    try:
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=timeout_seconds,
            stream=stream,
        )
        response.raise_for_status()

        if stream:
            content = _extract_stream_content(response)
        else:
            data = response.json()
            content = data["choices"][0]["message"]["content"]

        parsed = _extract_json_from_text(content)
        return _normalize_recommendation(parsed, fallback)
    except Exception as exc:
        return _fallback_recommendation(context_dict, reason=str(exc))


def validate_image_with_ai(image_base64: str, timeout_seconds: int = 15) -> Dict[str, Any]:
    """Validate image quality and content using AI vision model."""
    gemini_result = _call_gemini_vision_json(
        prompt=IMAGE_VALIDATION_PROMPT,
        image_base64=image_base64,
        timeout_seconds=timeout_seconds,
        max_output_tokens=300,
    )
    if gemini_result is not None:
        return _normalize_validation_payload(gemini_result)

    api_key = os.getenv("NVIDIA_API_KEY", "").strip()
    model_name = os.getenv("NVIDIA_MODEL", DEFAULT_NVIDIA_MODEL)
    base_url = os.getenv("NVIDIA_API_BASE_URL", DEFAULT_NVIDIA_BASE_URL).rstrip("/")

    fallback_validation = {
        "is_leaf": True,
        "quality_good": True,
        "estimated_crop": "Unknown",
        "disease_visible": True,
        "confidence": 0.5,
        "reason": "Image validation unavailable; proceeding with model prediction",
    }

    if not api_key:
        return fallback_validation

    url = f"{base_url}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "model": model_name,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": IMAGE_VALIDATION_PROMPT},
                    {
                        "type": "image",
                        "image": {
                            "format": "jpeg",
                            "data": image_base64,
                        },
                    },
                ],
            }
        ],
        "max_tokens": 300,
        "temperature": 0.3,
    }

    try:
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=timeout_seconds,
        )
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        validation = _extract_json_from_text(content)
        return _normalize_validation_payload(validation)
    except Exception:
        return fallback_validation


def get_leaf_info_with_ai(image_base64: str, timeout_seconds: int = 15) -> Dict[str, Any]:
    """Extract detailed leaf/crop/disease info using AI vision models."""
    gemini_result = _call_gemini_vision_json(
        prompt=LEAF_INFO_PROMPT,
        image_base64=image_base64,
        timeout_seconds=timeout_seconds,
        max_output_tokens=280,
    )
    if gemini_result is not None:
        normalized = _normalize_leaf_info_payload(gemini_result, source="gemini")
        if (
            normalized["leaf_name"] != "Unknown"
            or normalized["crop"] != "Unknown"
            or normalized["disease"] != "Unknown"
        ):
            return normalized

    api_key = os.getenv("NVIDIA_API_KEY", "").strip()
    model_name = os.getenv("NVIDIA_MODEL", DEFAULT_NVIDIA_MODEL)
    base_url = os.getenv("NVIDIA_API_BASE_URL", DEFAULT_NVIDIA_BASE_URL).rstrip("/")

    if not api_key:
        return _leaf_info_fallback("no_vision_api_key")

    url = f"{base_url}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model_name,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": LEAF_INFO_PROMPT},
                    {
                        "type": "image",
                        "image": {
                            "format": "jpeg",
                            "data": image_base64,
                        },
                    },
                ],
            }
        ],
        "max_tokens": 320,
        "temperature": 0.2,
    }

    try:
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=timeout_seconds,
        )
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        parsed = _extract_json_from_text(content)
        normalized = _normalize_leaf_info_payload(parsed, source="nvidia")
        if (
            normalized["leaf_name"] != "Unknown"
            or normalized["crop"] != "Unknown"
            or normalized["disease"] != "Unknown"
        ):
            return normalized
        return _leaf_info_fallback("leaf_info_unknown")
    except Exception as exc:
        return _leaf_info_fallback(str(exc))


def detect_unknown_plant_disease_with_ai(image_base64: str, timeout_seconds: int = 15) -> Dict[str, Any]:
    """Fallback detector for out-of-dataset or unknown predictions."""
    gemini_result = _call_gemini_vision_json(
        prompt=UNKNOWN_PLANT_DISEASE_PROMPT,
        image_base64=image_base64,
        timeout_seconds=timeout_seconds,
        max_output_tokens=220,
    )

    if gemini_result is not None:
        crop = str(gemini_result.get("crop", "Unknown") or "Unknown").strip()
        disease = str(gemini_result.get("disease", "Unknown") or "Unknown").strip()
        try:
            confidence = float(gemini_result.get("confidence", 0.0) or 0.0)
        except Exception:
            confidence = 0.0
        confidence = max(0.0, min(1.0, confidence))
        reason = str(gemini_result.get("reason", "") or "Estimated via Gemini fallback").strip()

        if crop or disease:
            return {
                "crop": crop if crop else "Unknown",
                "disease": disease if disease else "Unknown",
                "confidence": confidence,
                "reason": reason,
            }

    api_key = os.getenv("NVIDIA_API_KEY", "").strip()
    model_name = os.getenv("NVIDIA_MODEL", DEFAULT_NVIDIA_MODEL)
    base_url = os.getenv("NVIDIA_API_BASE_URL", DEFAULT_NVIDIA_BASE_URL).rstrip("/")

    fallback_result = {
        "crop": "Unknown",
        "disease": "Unknown",
        "confidence": 0.0,
        "reason": "Unknown fallback unavailable",
    }

    if not api_key:
        return fallback_result

    url = f"{base_url}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model_name,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": UNKNOWN_PLANT_DISEASE_PROMPT},
                    {
                        "type": "image",
                        "image": {
                            "format": "jpeg",
                            "data": image_base64,
                        },
                    },
                ],
            }
        ],
        "max_tokens": 250,
        "temperature": 0.2,
    }

    try:
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=timeout_seconds,
        )
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        parsed = _extract_json_from_text(content)

        crop = str(parsed.get("crop", "Unknown") or "Unknown").strip()
        disease = str(parsed.get("disease", "Unknown") or "Unknown").strip()
        try:
            confidence = float(parsed.get("confidence", 0.0) or 0.0)
        except Exception:
            confidence = 0.0
        confidence = max(0.0, min(1.0, confidence))
        reason = str(parsed.get("reason", "") or "Estimated via API fallback").strip()

        return {
            "crop": crop if crop else "Unknown",
            "disease": disease if disease else "Unknown",
            "confidence": confidence,
            "reason": reason,
        }
    except Exception as exc:
        fallback_result["reason"] = str(exc)
        return fallback_result


def validate_dataset_with_ai(dataset_info: Dict[str, Any]) -> Dict[str, Any]:
    """Validate dataset availability using AI; fallback for training."""
    api_key = os.getenv("NVIDIA_API_KEY", "").strip()
    
    fallback_response = {
        "dataset_status": "unavailable_using_ai_recommendations",
        "recommendation": "Using AI-generated recommendations for dataset synthesis or data augmentation",
        "alternative_action": "Generate synthetic training data or use transfer learning with pretrained models",
        "message": "Dataset not found. AI-powered fallback activated for model recommendations.",
    }

    if not api_key:
        return fallback_response

    model_name = os.getenv("NVIDIA_MODEL", DEFAULT_NVIDIA_MODEL)
    base_url = os.getenv("NVIDIA_API_BASE_URL", DEFAULT_NVIDIA_BASE_URL).rstrip("/")

    url = f"{base_url}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    prompt = (
        f"Dataset check failure:\n"
        f"Expected path: {dataset_info.get('path', 'unknown')}\n"
        f"Error: {dataset_info.get('error', 'dataset not found')}\n\n"
        f"Recommend: 1) Alternative data source 2) Data generation strategy 3) Model fallback approach\n"
        f"Return JSON: {{'dataset_status': 'str', 'recommendation': 'str', 'alternative_action': 'str'}}"
    )

    payload = {
        "model": model_name,
        "messages": [
            {"role": "user", "content": prompt},
        ],
        "max_tokens": 500,
        "temperature": 0.5,
    }

    try:
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=15,
        )
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        result = _extract_json_from_text(content)
        return result
    except Exception:
        return fallback_response
