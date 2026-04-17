# Product Requirements Document (PRD)
## AgriVision - AI Crop Intelligence System

**Version:** 1.0
**Date:** April 1, 2026
**Hackathon:** Matrix Fusion 4.0 - AI Hackathon 2026
**Client:** Mist Agri Corps Ltd

---

## 1. Executive Summary

### 1.1 Product Vision
AgriVision is an AI-powered crop disease intelligence system that analyzes leaf photographs using computer vision and provides geo-aware recovery recommendations through LLM integration. The system targets field agronomists managing large-scale agricultural operations.

### 1.2 Problem Statement
Mist Agri Corps Ltd manages 3,000+ acres across multiple Indian states, cultivating tomatoes, apples, and grapes. Manual disease detection is:
- **Slow:** Delays treatment, reducing yield
- **Inconsistent:** Depends on individual expertise
- **Costly:** Requires multiple field visits
- **Not scalable:** Can't keep pace with expansion

### 1.3 Solution Overview
A local web application that:
1. Accepts leaf images (drone/mobile with GPS metadata)
2. Validates image quality (blur detection)
3. Classifies diseases using CNN (EfficientNet/ResNet)
4. Provides confidence-gated predictions
5. Generates context-aware treatment recommendations via LLM

---

## 2. Stakeholders

| Role | Description | Needs |
|------|-------------|-------|
| Field Agronomist | Primary user, captures images | Quick diagnosis, actionable recommendations |
| Farm Manager | Supervises operations | Dashboard insights, yield protection |
| Mist Agri Corps IT | System maintenance | Easy deployment, minimal dependencies |
| Hackathon Judges | Evaluation | Working demo, clean architecture |

---

## 3. Functional Requirements

### 3.1 Image Processing Core (Module 01)

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-1.1 | Accept JPEG/PNG images up to 10MB | Critical | System handles standard image formats |
| FR-1.2 | Extract GPS metadata from EXIF | High | Location displayed in results |
| FR-1.3 | Resize images to model input size (224x224) | Critical | Automatic preprocessing |
| FR-1.4 | Normalize pixel values | Critical | Values scaled to [0,1] or [-1,1] |
| FR-1.5 | Support batch upload (future) | Low | Single image for MVP |

### 3.2 Input Validation & Guardrails (Module 04)

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-2.1 | Blur detection using Laplacian variance | Critical | Reject images with variance < 100 |
| FR-2.2 | File type validation | Critical | Only accept image formats |
| FR-2.3 | File size validation | High | Reject files > 10MB |
| FR-2.4 | Confidence threshold gate (60%) | Critical | Flag low-confidence predictions |
| FR-2.5 | GPS validation against farm regions | Nice-to-have | Warning for out-of-region locations |

### 3.3 AI Vision Model (Module 02)

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-3.1 | CNN-based classification | Critical | EfficientNetB0 or ResNet50 |
| FR-3.2 | Multi-class disease detection | Critical | All diseases in PlantVillage dataset |
| FR-3.3 | Confidence score output | Critical | Probability for predicted class |
| FR-3.4 | Support 3 crop types | Critical | Tomato, Apple, Grape |
| FR-3.5 | Model loads in < 30 seconds | Critical | Tested on standard laptop |
| FR-3.6 | Inference time < 3 seconds | High | Per single image |

### 3.4 Prediction Output (Module 03 & 04)

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-4.1 | Disease class name | Critical | Human-readable label |
| FR-4.2 | Confidence percentage | Critical | 0-100% |
| FR-4.3 | Severity level | High | Low/Moderate/High/Critical |
| FR-4.4 | Crop type identification | Critical | Based on prediction class |

### 3.5 LLM Context Layer (Module 03)

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-5.1 | Recovery steps | Critical | Numbered action items |
| FR-5.2 | Organic treatment options | Critical | Natural remedies |
| FR-5.3 | Chemical treatment options | Critical | Pesticide recommendations |
| FR-5.4 | Time-to-recovery estimate | High | Days/weeks range |
| FR-5.5 | Preventive measures | High | Future prevention advice |
| FR-5.6 | Geo-aware recommendations | High | Based on GPS location |
| FR-5.7 | Time-context awareness | Nice-to-have | Optimal spraying windows |
| FR-5.8 | Weather consideration | Nice-to-have | Rain forecast warnings |

### 3.6 Web Application (Module 05)

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-6.1 | Image upload interface | Critical | Drag-drop or file picker |
| FR-6.2 | Crop type selector | Critical | Dropdown: Tomato/Apple/Grape |
| FR-6.3 | Prediction results display | Critical | Disease, confidence, severity |
| FR-6.4 | LLM recommendation panel | Critical | Formatted treatment guidance |
| FR-6.5 | Image preview | High | Show uploaded image |
| FR-6.6 | Loading indicators | High | During inference |
| FR-6.7 | Error messages | Critical | User-friendly feedback |
| FR-6.8 | Responsive design | Low | Mobile-friendly (nice-to-have) |

---

## 4. Non-Functional Requirements

### 4.1 Performance
| Requirement | Target |
|-------------|--------|
| Model load time | < 30 seconds |
| Inference latency | < 3 seconds |
| LLM response time | < 5 seconds |
| Total request time | < 10 seconds |

### 4.2 Reliability
| Requirement | Target |
|-------------|--------|
| System uptime | 99% during demo |
| Error handling | Graceful failures with messages |
| Input validation | Prevent invalid inputs |

### 4.3 Usability
| Requirement | Target |
|-------------|--------|
| Learning curve | < 5 minutes for new user |
| Clicks to result | < 3 clicks |
| Accessibility | Basic WCAG compliance |

### 4.4 Portability
| Requirement | Target |
|-------------|--------|
| Deployment | Local machine (localhost) |
| OS Support | Windows/Mac/Linux |
| Dependencies | Documented in requirements.txt |

---

## 5. Technical Constraints

### 5.1 Must Use
- CNN architecture (EfficientNet/ResNet recommended)
- Transfer learning approach
- PlantVillage dataset from Kaggle
- Free LLM API (NVIDIA NIM recommended - https://build.nvidia.com/)
- Local web server (Next.js/FastAPI/Streamlit)

### 5.2 Must Not Use
- Paid APIs without justification
- Hardcoded/mocked predictions
- Pre-written static LLM responses
- Pure Jupyter notebooks as demo

### 5.3 Dataset Classes (PlantVillage - Filtered)

**Apple (4 classes):**
- Apple___Apple_scab
- Apple___Black_rot
- Apple___Cedar_apple_rust
- Apple___healthy

**Grape (4 classes):**
- Grape___Black_rot
- Grape___Esca_(Black_Measles)
- Grape___Leaf_blight_(Isariopsis_Leaf_Spot)
- Grape___healthy

**Tomato (10 classes):**
- Tomato___Bacterial_spot
- Tomato___Early_blight
- Tomato___Late_blight
- Tomato___Leaf_Mold
- Tomato___Septoria_leaf_spot
- Tomato___Spider_mites Two-spotted_spider_mite
- Tomato___Target_Spot
- Tomato___Tomato_Yellow_Leaf_Curl_Virus
- Tomato___Tomato_mosaic_virus
- Tomato___healthy

**Total: 18 classes**

---

## 6. Success Metrics

### 6.1 Model Performance
| Metric | Target | Minimum |
|--------|--------|---------|
| Macro F1 Score | > 0.90 | > 0.85 |
| Precision | > 0.88 | > 0.82 |
| Recall | > 0.88 | > 0.82 |

### 6.2 System Performance
| Metric | Target |
|--------|--------|
| End-to-end latency | < 10 seconds |
| Blur detection accuracy | > 95% |
| Confidence calibration | Reliable 60% threshold |

### 6.3 User Experience
| Metric | Target |
|--------|--------|
| Task completion rate | 100% |
| Error rate | < 5% |

---

## 7. Deliverables Checklist

- [ ] Trained AI Model (weights + architecture + inference script)
- [ ] Source Code (GitHub repo with README)
- [ ] Live Local Demo (working web app)
- [ ] Evaluation Report (confusion matrix, F1, precision, recall)
- [ ] LLM Prompt Design Document
- [ ] 10-minute Presentation

---

## 8. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Model overfitting | Medium | High | Data augmentation, validation split |
| LLM API rate limits | Medium | High | Caching, fallback responses |
| Slow inference | Low | Medium | Model optimization, GPU if available |
| Class imbalance | High | Medium | Weighted loss, oversampling |
| Demo failure | Low | Critical | Local testing, backup plan |

---

## 9. Timeline (24-Hour Sprint)

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Setup & Planning | 1 hour | Environment ready, plan finalized |
| Data Preparation | 2 hours | Dataset downloaded, preprocessed |
| Model Training | 6 hours | Trained model with checkpoints |
| Backend Development | 4 hours | API endpoints functional |
| Frontend Development | 4 hours | UI complete |
| LLM Integration | 3 hours | Prompt engineering done |
| Testing & Debugging | 2 hours | All flows verified |
| Documentation | 1 hour | README, reports complete |
| Buffer | 1 hour | Final polish |

---

## 10. Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Team Lead | | | |
| Tech Lead | | | |

---

*Document prepared for Matrix Fusion 4.0 - AI Hackathon 2026*
