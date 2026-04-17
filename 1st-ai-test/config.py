from __future__ import annotations

import os
from typing import Tuple

# Extended crop support (40+ crops)
SUPPORTED_CROPS = {
    # Vegetables
    "Tomato", "Potato", "Bell_Pepper", "Cucumber", "Squash", "Pumpkin", 
    "Cabbage", "Lettuce", "Spinach", "Broccoli", "Carrot", "Bean", "Pea",
    # Tree Fruits
    "Apple", "Grape", "Peach", "Cherry", "Blueberry", "Raspberry", "Strawberry",
    "Orange", "Lemon", "Mango", "Papaya", "Avocado", "Coconut", "Almond", "Walnut",
    # Grains
    "Corn", "Wheat", "Barley", "Rye", "Oats", "Rice", "Sorghum", "Millet", "Quinoa",
    # Beverages & Specialty
    "Coffee", "Tea", "Cacao", "Cotton", "Sugarcane", "Tobacco",
    # Herbs & Spices
    "Basil", "Oregano", "Thyme", "Rosemary", "Mint", "Ginger", "Turmeric", "Chili", "Garlic", "Onion"
}

CROP_CATEGORY = {
    # Vegetables
    "Tomato": "Vegetable", "Potato": "Vegetable", "Bell_Pepper": "Vegetable", 
    "Cucumber": "Vegetable", "Squash": "Vegetable", "Pumpkin": "Vegetable",
    "Cabbage": "Vegetable", "Lettuce": "Vegetable", "Spinach": "Vegetable",
    "Broccoli": "Vegetable", "Carrot": "Vegetable", "Bean": "Vegetable", "Pea": "Vegetable",
    # Tree Fruits
    "Apple": "Fruit", "Grape": "Fruit", "Peach": "Fruit", "Cherry": "Fruit",
    "Blueberry": "Fruit", "Raspberry": "Fruit", "Strawberry": "Fruit",
    "Orange": "Fruit", "Lemon": "Fruit", "Mango": "Fruit", "Papaya": "Fruit",
    "Avocado": "Fruit", "Coconut": "Fruit", "Almond": "Fruit", "Walnut": "Fruit",
    # Grains
    "Corn": "Grain", "Wheat": "Grain", "Barley": "Grain", "Rye": "Grain", "Oats": "Grain",
    "Rice": "Grain", "Sorghum": "Grain", "Millet": "Grain", "Quinoa": "Grain",
    # Beverages & Specialty
    "Coffee": "Beverage", "Tea": "Beverage", "Cacao": "Beverage",
    "Cotton": "Specialty", "Sugarcane": "Specialty", "Tobacco": "Specialty",
    # Herbs & Spices
    "Basil": "Herb", "Oregano": "Herb", "Thyme": "Herb", "Rosemary": "Herb", "Mint": "Herb",
    "Ginger": "Spice", "Turmeric": "Spice", "Chili": "Spice", "Garlic": "Spice", "Onion": "Spice"
}

IMAGE_SIZE = 224
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.60"))
BLUR_THRESHOLD = 100.0

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

DEFAULT_NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"
DEFAULT_NVIDIA_MODEL = "mistralai/mistral-small-4-119b-2603"


def parse_crop_and_disease(class_name: str) -> Tuple[str, str]:
    """Parse PlantVillage class names such as Tomato___Early_blight."""
    if "___" in class_name:
        crop_raw, disease_raw = class_name.split("___", 1)
    elif "_" in class_name:
        crop_raw, disease_raw = class_name.split("_", 1)
    else:
        crop_raw, disease_raw = class_name, "Unknown"

    crop = crop_raw.replace("_", " ").strip().title()
    disease = disease_raw.replace("_", " ").strip()
    if disease.lower() == "healthy":
        disease = "Healthy"

    return crop, disease


def severity_from_confidence(confidence: float) -> str:
    if confidence >= 0.85:
        return "High"
    if confidence >= 0.75:
        return "Moderate"
    return "Low"
