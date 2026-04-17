from __future__ import annotations

import io
import json
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, Tuple

import cv2
import numpy as np
import torch
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from PIL import Image

from config import (
    BLUR_THRESHOLD,
    CONFIDENCE_THRESHOLD,
    CROP_CATEGORY,
    ALLOWED_IMAGE_EXTENSIONS,
    parse_crop_and_disease,
    severity_from_confidence,
)
from model_utils import build_model, get_eval_transform
from nvidia_client import (
    call_nvidia_llm,
    validate_image_with_ai,
    detect_unknown_plant_disease_with_ai,
    get_leaf_info_with_ai,
)
import base64

load_dotenv()

ARTIFACTS_DIR = Path("artifacts")
MODEL_META_PATH = ARTIFACTS_DIR / "model_meta.json"
MODEL_WEIGHTS_PATH = ARTIFACTS_DIR / "best_model.pth"

model: torch.nn.Module | None = None
class_names: list[str] = []
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
transform = get_eval_transform()
model_load_seconds: float | None = None
load_error: str | None = None


def _load_model() -> None:
    global model, class_names, model_load_seconds, load_error

    start = time.perf_counter()

    if not MODEL_META_PATH.exists() or not MODEL_WEIGHTS_PATH.exists():
        load_error = (
            "Model artifacts not found. Run training first to create artifacts/model_meta.json "
            "and artifacts/best_model.pth"
        )
        return

    try:
        meta = json.loads(MODEL_META_PATH.read_text(encoding="utf-8"))
        class_names = meta["class_names"]
        arch = meta["arch"]

        loaded_model = build_model(arch=arch, num_classes=len(class_names), pretrained=False)
        loaded_model.load_state_dict(torch.load(MODEL_WEIGHTS_PATH, map_location=device))
        loaded_model.to(device)
        loaded_model.eval()

        model = loaded_model
        model_load_seconds = time.perf_counter() - start
    except Exception as exc:
        load_error = str(exc)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan context manager for startup and shutdown events."""
    # Startup: Load model
    _load_model()
    yield
    # Shutdown: Cleanup (if needed)
    pass


app = FastAPI(title="AgriVisionAI", version="1.0.0", lifespan=lifespan)
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


def _is_allowed_image(filename: str) -> bool:
    suffix = Path(filename).suffix.lower()
    return suffix in ALLOWED_IMAGE_EXTENSIONS


def _decode_upload_image(upload: UploadFile) -> Tuple[Image.Image, np.ndarray]:
    data = upload.file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    try:
        image = Image.open(io.BytesIO(data)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {exc}") from exc

    image_np = np.array(image)
    return image, image_np


def _blur_score(image_np: np.ndarray) -> float:
    gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def _predict_class(image: Image.Image) -> Tuple[str, str, float]:
    if model is None:
        raise RuntimeError("Model is not loaded")

    tensor = transform(image).unsqueeze(0).to(device)
    with torch.no_grad():
        logits = model(tensor)
        probs = torch.softmax(logits, dim=1)
        pred_idx = int(torch.argmax(probs, dim=1).item())
        confidence = float(probs[0, pred_idx].item())

    class_name = class_names[pred_idx]
    crop, disease = parse_crop_and_disease(class_name)
    return crop, disease, confidence


def _build_recapture_response(reason: str, blur_score: float | None, confidence: float | None) -> Dict[str, Any]:
    return {
        "crop": "Unknown",
        "crop_category": "Unknown",
        "disease": "Unknown",
        "confidence": 0.0 if confidence is None else confidence,
        "severity": "Low",
        "decision": "recapture",
        "blur_score": blur_score,
        "confidence_gate_message": reason,
        "recommendation": {
            "summary": "Image quality or confidence is too low for reliable diagnosis.",
            "immediate_actions": [
                "Capture a closer leaf image with good natural light.",
                "Avoid blurry motion and include only one leaf in frame.",
                "Upload again for a reliable diagnosis.",
            ],
            "organic_treatment": ["Use general field hygiene until diagnosis is confirmed."],
            "chemical_treatment": ["Do not apply chemical treatment before confirmation."],
            "recovery_estimate": "Re-evaluate after new image upload",
            "preventive_measures": [
                "Monitor nearby plants for symptom spread.",
                "Remove severely damaged leaves if needed.",
            ],
            "monitoring_checklist": ["Take a second image from another angle within 1-2 minutes."],
            "safety_note": "Wear gloves when handling affected plants.",
        },
    }


def _normalize_text_label(value: str, title_case: bool = True) -> str:
    text = (value or "").replace("_", " ").strip()
    if not text:
        return "Unknown"
    if text.lower() == "unknown":
        return "Unknown"
    if text.lower() == "healthy":
        return "Healthy"
    return text.title() if title_case else text


def _normalize_crop_name(value: str) -> str:
    text = _normalize_text_label(value, title_case=False)
    text = text.replace("(", " ").replace(")", " ")
    text = " ".join(text.split())
    if not text:
        return "Unknown"

    aliases = {
        "pepper": "Bell Pepper",
        "bell pepper": "Bell Pepper",
        "corn maize": "Corn",
        "maize": "Corn",
        "cherry including sour": "Cherry",
        "orange citrus greening": "Orange",
    }

    normalized_key = text.lower()
    if normalized_key in aliases:
        return aliases[normalized_key]

    return _normalize_text_label(text)


def _resolve_crop_category(crop_name: str) -> str:
    if not crop_name or crop_name == "Unknown":
        return "Unknown"

    candidates = [
        crop_name,
        crop_name.replace(" ", "_"),
        crop_name.replace(" ", ""),
        crop_name.split(" ")[0],
    ]

    for candidate in candidates:
        if candidate in CROP_CATEGORY:
            return CROP_CATEGORY[candidate]

    return "Unknown"


@app.get("/health")
def health() -> Dict[str, Any]:
    return {
        "status": "ok" if model is not None else "degraded",
        "model_ready": model is not None,
        "model_load_seconds": model_load_seconds,
        "error": load_error,
    }


@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse(request=request, name="index.html", context={})


@app.post("/predict")
async def predict(
    image: UploadFile = File(...),
    location: str = Form(default="Unknown"),
    time_context: str = Form(default="Unknown"),
    weather: str = Form(default="Unknown"),
):
    if model is None:
        _load_model()

    if model is None:
        return JSONResponse(
            status_code=503,
            content={
                "error": "Model not ready",
                "details": load_error or "Train model first and ensure artifacts are present.",
            },
        )

    if not _is_allowed_image(image.filename or ""):
        raise HTTPException(status_code=400, detail="Unsupported file type. Upload jpg, jpeg, png, bmp, or webp.")

    pil_image, image_np = _decode_upload_image(image)
    blur_value = _blur_score(image_np)

    if blur_value < BLUR_THRESHOLD:
        return _build_recapture_response(
            reason=f"Image is blurry (blur score {blur_value:.2f}). Please re-capture.",
            blur_score=blur_value,
            confidence=None,
        )

    # AI-powered image validation
    validation_buffer = io.BytesIO()
    pil_image.save(validation_buffer, format="JPEG")
    image_base64 = base64.b64encode(validation_buffer.getvalue()).decode("utf-8")
    ai_validation = validate_image_with_ai(image_base64)
    
    if not ai_validation.get("is_leaf") or not ai_validation.get("quality_good"):
        return _build_recapture_response(
            reason=f"AI validation: {ai_validation.get('reason', 'Image quality insufficient for diagnosis')}",
            blur_score=blur_value,
            confidence=ai_validation.get("confidence", 0),
        )

    ai_leaf_info = get_leaf_info_with_ai(image_base64)
    ai_leaf_crop = _normalize_crop_name(str(ai_leaf_info.get("crop", "Unknown") or "Unknown"))
    ai_leaf_disease = _normalize_text_label(str(ai_leaf_info.get("disease", "Unknown") or "Unknown"))
    ai_leaf_name = _normalize_text_label(str(ai_leaf_info.get("leaf_name", ai_leaf_crop) or ai_leaf_crop))
    ai_leaf_reason = str(ai_leaf_info.get("reasoning", "") or "")

    try:
        ai_leaf_confidence = float(ai_leaf_info.get("confidence", 0.0) or 0.0)
    except Exception:
        ai_leaf_confidence = 0.0

    raw_key_observations = ai_leaf_info.get("key_observations", [])
    key_observations = raw_key_observations if isinstance(raw_key_observations, list) else []
    raw_health_status = str(ai_leaf_info.get("health_status", "uncertain") or "uncertain").strip().lower()
    health_status = raw_health_status if raw_health_status in {"healthy", "diseased", "uncertain"} else "uncertain"
    leaf_info_payload = {
        "leaf_name": ai_leaf_name,
        "crop": ai_leaf_crop,
        "disease": ai_leaf_disease,
        "health_status": health_status,
        "confidence": round(max(0.0, min(1.0, ai_leaf_confidence)), 4),
        "key_observations": key_observations,
        "reasoning": ai_leaf_reason,
        "source": str(ai_leaf_info.get("source", "fallback") or "fallback"),
    }

    model_crop_raw, model_disease_raw, confidence = _predict_class(pil_image)
    model_crop = _normalize_crop_name(model_crop_raw)
    model_disease = _normalize_text_label(model_disease_raw)

    if leaf_info_payload["crop"] == "Unknown":
        leaf_info_payload["crop"] = model_crop
    if leaf_info_payload["leaf_name"] == "Unknown":
        leaf_info_payload["leaf_name"] = f"{model_crop} Leaf" if model_crop != "Unknown" else "Unknown"
    if leaf_info_payload["disease"] == "Unknown":
        leaf_info_payload["disease"] = model_disease
    if not leaf_info_payload["reasoning"]:
        leaf_info_payload["reasoning"] = "Leaf info API unavailable; using dataset model output."
    if leaf_info_payload["source"] == "fallback":
        leaf_info_payload["source"] = "api_fallback_dataset"

    ai_estimated_crop = _normalize_crop_name(str(ai_validation.get("estimated_crop", "Unknown") or "Unknown"))

    crop = model_crop
    disease = model_disease
    name_corrected = False
    name_correction_reason = ""

    has_crop_mismatch = (
        ai_estimated_crop != "Unknown" and ai_estimated_crop.lower() != model_crop.lower()
    ) or (
        ai_leaf_crop != "Unknown" and ai_leaf_crop.lower() != model_crop.lower()
    )
    has_disease_hint = ai_leaf_disease != "Unknown" and ai_leaf_disease.lower() != model_disease.lower()

    if has_crop_mismatch or (has_disease_hint and ai_leaf_confidence >= 0.55):
        corrected_crop = (
            ai_leaf_crop
            if ai_leaf_crop != "Unknown"
            else (ai_estimated_crop if ai_estimated_crop != "Unknown" else model_crop)
        )
        corrected_disease = ai_leaf_disease if ai_leaf_disease != "Unknown" else model_disease

        if corrected_crop != model_crop or corrected_disease != model_disease:
            crop = corrected_crop
            disease = corrected_disease
            name_corrected = True
            name_correction_reason = (
                f"Leaf identity adjusted by AI vision from '{model_crop} / {model_disease}' "
                f"to '{crop} / {disease}'. {ai_leaf_reason}"
            ).strip()

            # Keep leaf_info aligned with the corrected prediction shown to users.
            leaf_info_payload["crop"] = crop
            leaf_info_payload["disease"] = disease
            if (
                leaf_info_payload.get("leaf_name") in {"Unknown", "Tomato Leaf"}
                or str(leaf_info_payload.get("leaf_name", "")).strip().lower().startswith("tomato")
            ):
                leaf_info_payload["leaf_name"] = f"{crop} Leaf" if crop != "Unknown" else "Unknown"

    if confidence < CONFIDENCE_THRESHOLD:
        # Below 60% confidence, switch from dataset-only result to worldwide AI fallback.
        api_crop = ai_leaf_crop
        api_disease = ai_leaf_disease
        api_reason = ai_leaf_reason
        api_confidence = ai_leaf_confidence

        if api_crop == "Unknown" and api_disease == "Unknown":
            api_guess = detect_unknown_plant_disease_with_ai(image_base64)
            api_crop = _normalize_crop_name(str(api_guess.get("crop", "Unknown") or "Unknown"))
            api_disease = _normalize_text_label(str(api_guess.get("disease", "Unknown") or "Unknown"))
            api_reason = str(api_guess.get("reason", "") or "")

            try:
                api_confidence = float(api_guess.get("confidence", 0.0) or 0.0)
            except Exception:
                api_confidence = 0.0

        use_worldwide_crop = (
            api_crop
            if api_crop != "Unknown"
            else (ai_estimated_crop if ai_estimated_crop != "Unknown" else crop)
        )
        use_worldwide_disease = api_disease if api_disease != "Unknown" else disease
        merged_confidence = max(confidence, api_confidence)
        fallback_decision = "monitor" if use_worldwide_disease.lower() == "healthy" else "treat"
        fallback_severity = severity_from_confidence(merged_confidence)

        fallback_context = {
            "crop": use_worldwide_crop,
            "disease": use_worldwide_disease,
            "confidence": round(merged_confidence, 4),
            "location": location,
            "time_context": time_context,
            "weather": weather,
            "decision": fallback_decision,
        }
        fallback_recommendation = call_nvidia_llm(fallback_context)

        return {
            "crop": use_worldwide_crop,
            "crop_category": _resolve_crop_category(use_worldwide_crop),
            "disease": use_worldwide_disease,
            "confidence": round(merged_confidence, 4),
            "severity": fallback_severity,
            "decision": fallback_decision,
            "blur_score": round(blur_value, 2),
            "analysis_source": "worldwide_ai",
            "dataset_prediction": {
                "crop": model_crop,
                "disease": model_disease,
                "confidence": round(confidence, 4),
            },
            "worldwide_ai": {
                "crop": api_crop,
                "disease": api_disease,
                "confidence": round(api_confidence, 4),
                "reason": api_reason or "Worldwide AI fallback used for low-confidence dataset prediction.",
            },
            "leaf_info": leaf_info_payload,
            "ai_leaf_validation": {
                "estimated_crop": ai_estimated_crop,
                "name_corrected": name_corrected,
                "reason": name_correction_reason,
            },
            "confidence_gate_message": (
                f"Dataset confidence {confidence:.2f} is below threshold {CONFIDENCE_THRESHOLD:.2f}; "
                "switched to worldwide AI analysis and detailed recommendation."
            ),
            "recommendation": fallback_recommendation,
        }

    severity = severity_from_confidence(confidence)
    decision = "monitor" if disease.lower() == "healthy" else "treat"

    context = {
        "crop": crop,
        "disease": disease,
        "confidence": round(confidence, 4),
        "location": location,
        "time_context": time_context,
        "weather": weather,
        "decision": decision,
    }
    recommendation = call_nvidia_llm(context)

    response = {
        "crop": crop,
        "crop_category": _resolve_crop_category(crop),
        "disease": disease,
        "confidence": round(confidence, 4),
        "severity": severity,
        "decision": decision,
        "blur_score": round(blur_value, 2),
        "analysis_source": "dataset_model_ai_corrected" if name_corrected else "dataset_model",
        "confidence_gate_message": name_correction_reason,
        "leaf_info": leaf_info_payload,
        "ai_leaf_validation": {
            "estimated_crop": ai_estimated_crop,
            "name_corrected": name_corrected,
            "reason": name_correction_reason,
        },
        "recommendation": recommendation,
    }

    return response
