# ML Model Training Brainstorm Document
## AgriVision - CNN Disease Classification

---

## 1. Dataset Analysis

### 1.1 PlantVillage Dataset Overview
**Source:** https://www.kaggle.com/datasets/abdallahalidev/plantvillage-dataset

**Structure:**
```
plantvillage/
├── segmented/       # Background removed
├── color/           # Original RGB images
└── grayscale/       # Grayscale versions
```

**Recommendation:** Use `color/` for best real-world applicability

### 1.2 Relevant Classes (18 total)

| Crop | Class Name | Approx. Images |
|------|------------|----------------|
| **Apple** | Apple___Apple_scab | 630 |
| | Apple___Black_rot | 621 |
| | Apple___Cedar_apple_rust | 275 |
| | Apple___healthy | 1,645 |
| **Grape** | Grape___Black_rot | 1,180 |
| | Grape___Esca_(Black_Measles) | 1,383 |
| | Grape___Leaf_blight_(Isariopsis_Leaf_Spot) | 1,076 |
| | Grape___healthy | 423 |
| **Tomato** | Tomato___Bacterial_spot | 2,127 |
| | Tomato___Early_blight | 1,000 |
| | Tomato___Late_blight | 1,909 |
| | Tomato___Leaf_Mold | 952 |
| | Tomato___Septoria_leaf_spot | 1,771 |
| | Tomato___Spider_mites Two-spotted_spider_mite | 1,676 |
| | Tomato___Target_Spot | 1,404 |
| | Tomato___Tomato_Yellow_Leaf_Curl_Virus | 5,357 |
| | Tomato___Tomato_mosaic_virus | 373 |
| | Tomato___healthy | 1,591 |

### 1.3 Class Imbalance Analysis
```
Imbalance Ratio (max/min): ~19.5x
Most samples: Tomato_Yellow_Leaf_Curl_Virus (5,357)
Least samples: Apple_Cedar_apple_rust (275)

Severity:
- High imbalance: Apple_Cedar_apple_rust, Tomato_mosaic_virus
- Medium imbalance: Grape_healthy
- Low imbalance: Most tomato classes
```

---

## 2. Model Architecture Options

### 2.1 Option A: EfficientNetB0 (Recommended)

**Why EfficientNetB0:**
- Best accuracy-efficiency tradeoff
- Smaller memory footprint (5.3M params)
- Fast inference (~50ms on CPU)
- Excellent transfer learning performance

```python
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras import layers, Model

def create_efficientnet_model(num_classes=18):
    base_model = EfficientNetB0(
        weights='imagenet',
        include_top=False,
        input_shape=(224, 224, 3)
    )

    # Freeze early layers
    for layer in base_model.layers[:-20]:
        layer.trainable = False

    x = base_model.output
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.5)(x)
    x = layers.Dense(256, activation='relu')(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(num_classes, activation='softmax')(x)

    model = Model(inputs=base_model.input, outputs=outputs)
    return model
```

### 2.2 Option B: ResNet50

**Why ResNet50:**
- Well-established architecture
- Excellent feature extraction
- Good for complex patterns

```python
from tensorflow.keras.applications import ResNet50

def create_resnet_model(num_classes=18):
    base_model = ResNet50(
        weights='imagenet',
        include_top=False,
        input_shape=(224, 224, 3)
    )

    for layer in base_model.layers[:-30]:
        layer.trainable = False

    x = base_model.output
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dense(512, activation='relu')(x)
    x = layers.Dropout(0.5)(x)
    outputs = layers.Dense(num_classes, activation='softmax')(x)

    return Model(inputs=base_model.input, outputs=outputs)
```

### 2.3 Option C: MobileNetV2 (Lightweight)

**Why MobileNetV2:**
- Fastest inference
- Smallest model size (3.4M params)
- Good for edge deployment

```python
from tensorflow.keras.applications import MobileNetV2

def create_mobilenet_model(num_classes=18):
    base_model = MobileNetV2(
        weights='imagenet',
        include_top=False,
        input_shape=(224, 224, 3),
        alpha=1.0
    )

    x = base_model.output
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dense(128, activation='relu')(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(num_classes, activation='softmax')(x)

    return Model(inputs=base_model.input, outputs=outputs)
```

### 2.4 Model Comparison

| Model | Params | Size | Inference | Expected F1 |
|-------|--------|------|-----------|-------------|
| EfficientNetB0 | 5.3M | 20MB | 50ms | 0.92+ |
| ResNet50 | 25.6M | 98MB | 100ms | 0.91+ |
| MobileNetV2 | 3.4M | 14MB | 30ms | 0.88+ |

**Recommendation:** EfficientNetB0 for best balance

---

## 3. Data Preprocessing Pipeline

### 3.1 Data Loading
```python
import tensorflow as tf

def create_data_generator(data_dir, target_size=(224, 224), batch_size=32):
    """
    Create data generators with preprocessing.
    """
    datagen = tf.keras.preprocessing.image.ImageDataGenerator(
        rescale=1./255,
        validation_split=0.2,
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        horizontal_flip=True,
        vertical_flip=False,  # Leaves don't flip well vertically
        zoom_range=0.2,
        shear_range=0.1,
        fill_mode='reflect'
    )

    train_generator = datagen.flow_from_directory(
        data_dir,
        target_size=target_size,
        batch_size=batch_size,
        class_mode='categorical',
        subset='training',
        shuffle=True
    )

    val_generator = datagen.flow_from_directory(
        data_dir,
        target_size=target_size,
        batch_size=batch_size,
        class_mode='categorical',
        subset='validation',
        shuffle=False
    )

    return train_generator, val_generator
```

### 3.2 Advanced Augmentation (Albumentations)
```python
import albumentations as A
from albumentations.pytorch import ToTensorV2

train_transform = A.Compose([
    A.Resize(224, 224),
    A.RandomRotate90(p=0.5),
    A.HorizontalFlip(p=0.5),
    A.OneOf([
        A.GaussNoise(var_limit=(10, 50)),
        A.GaussianBlur(blur_limit=3),
        A.MotionBlur(blur_limit=3),
    ], p=0.3),
    A.OneOf([
        A.RandomBrightnessContrast(p=0.5),
        A.HueSaturationValue(p=0.5),
    ], p=0.5),
    A.CoarseDropout(
        max_holes=8,
        max_height=32,
        max_width=32,
        fill_value=0,
        p=0.3
    ),
    A.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    ),
    ToTensorV2()
])
```

### 3.3 Data Filtering Script
```python
import os
import shutil

# Only keep relevant crops
RELEVANT_CLASSES = [
    'Apple___Apple_scab',
    'Apple___Black_rot',
    'Apple___Cedar_apple_rust',
    'Apple___healthy',
    'Grape___Black_rot',
    'Grape___Esca_(Black_Measles)',
    'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)',
    'Grape___healthy',
    'Tomato___Bacterial_spot',
    'Tomato___Early_blight',
    'Tomato___Late_blight',
    'Tomato___Leaf_Mold',
    'Tomato___Septoria_leaf_spot',
    'Tomato___Spider_mites Two-spotted_spider_mite',
    'Tomato___Target_Spot',
    'Tomato___Tomato_Yellow_Leaf_Curl_Virus',
    'Tomato___Tomato_mosaic_virus',
    'Tomato___healthy'
]

def filter_dataset(source_dir, target_dir):
    os.makedirs(target_dir, exist_ok=True)
    for class_name in RELEVANT_CLASSES:
        src = os.path.join(source_dir, class_name)
        dst = os.path.join(target_dir, class_name)
        if os.path.exists(src):
            shutil.copytree(src, dst)
```

---

## 4. Handling Class Imbalance

### 4.1 Strategy 1: Weighted Loss Function
```python
from sklearn.utils.class_weight import compute_class_weight
import numpy as np

def compute_weights(train_generator):
    """Compute class weights for imbalanced dataset."""
    class_weights = compute_class_weight(
        class_weight='balanced',
        classes=np.arange(len(train_generator.class_indices)),
        y=train_generator.classes
    )
    return dict(enumerate(class_weights))

# Usage
class_weights = compute_weights(train_generator)
model.fit(train_generator, class_weight=class_weights, ...)
```

### 4.2 Strategy 2: Oversampling (SMOTE-like for Images)
```python
from imblearn.over_sampling import RandomOverSampler
import numpy as np

def oversample_minority_classes(images, labels, strategy='auto'):
    """
    Oversample minority classes.
    """
    # Reshape images for sklearn
    X_flat = images.reshape(len(images), -1)

    ros = RandomOverSampler(sampling_strategy=strategy, random_state=42)
    X_res, y_res = ros.fit_resample(X_flat, labels)

    # Reshape back
    X_res = X_res.reshape(-1, 224, 224, 3)
    return X_res, y_res
```

### 4.3 Strategy 3: Focal Loss
```python
import tensorflow as tf

def focal_loss(gamma=2.0, alpha=0.25):
    """
    Focal loss for handling class imbalance.
    """
    def focal_loss_fn(y_true, y_pred):
        epsilon = tf.keras.backend.epsilon()
        y_pred = tf.clip_by_value(y_pred, epsilon, 1.0 - epsilon)

        cross_entropy = -y_true * tf.math.log(y_pred)
        weight = alpha * tf.pow(1 - y_pred, gamma)
        focal_loss = weight * cross_entropy

        return tf.reduce_sum(focal_loss, axis=-1)

    return focal_loss_fn
```

### 4.4 Strategy 4: Data Augmentation for Minority Classes
```python
def augment_minority_classes(data_dir, min_samples=1000):
    """
    Apply extra augmentation to minority classes.
    """
    import imgaug.augmenters as iaa

    augmenter = iaa.Sequential([
        iaa.Fliplr(0.5),
        iaa.Rotate((-20, 20)),
        iaa.Multiply((0.8, 1.2)),
        iaa.GaussianBlur(sigma=(0, 0.5))
    ])

    for class_dir in os.listdir(data_dir):
        class_path = os.path.join(data_dir, class_dir)
        images = os.listdir(class_path)

        if len(images) < min_samples:
            # Augment until we reach min_samples
            needed = min_samples - len(images)
            # ... augmentation logic
```

**Recommendation:** Use weighted loss + augmentation for best results

---

## 5. Training Strategy

### 5.1 Training Configuration
```python
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import (
    ModelCheckpoint,
    EarlyStopping,
    ReduceLROnPlateau,
    TensorBoard
)

def get_training_config():
    return {
        'optimizer': Adam(learning_rate=1e-4),
        'loss': 'categorical_crossentropy',  # or focal_loss
        'metrics': ['accuracy'],
        'epochs': 30,
        'batch_size': 32
    }

def get_callbacks(model_name):
    return [
        ModelCheckpoint(
            f'checkpoints/{model_name}_best.h5',
            monitor='val_loss',
            save_best_only=True,
            verbose=1
        ),
        EarlyStopping(
            monitor='val_loss',
            patience=5,
            restore_best_weights=True
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=3,
            min_lr=1e-7
        ),
        TensorBoard(
            log_dir=f'logs/{model_name}'
        )
    ]
```

### 5.2 Training Script
```python
def train_model():
    """Complete training pipeline."""

    # 1. Load data
    train_gen, val_gen = create_data_generator(
        data_dir='data/filtered',
        target_size=(224, 224),
        batch_size=32
    )

    # 2. Create model
    model = create_efficientnet_model(num_classes=18)

    # 3. Compile
    config = get_training_config()
    model.compile(
        optimizer=config['optimizer'],
        loss=config['loss'],
        metrics=config['metrics']
    )

    # 4. Compute class weights
    class_weights = compute_weights(train_gen)

    # 5. Train
    history = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=config['epochs'],
        class_weight=class_weights,
        callbacks=get_callbacks('efficientnet_v1')
    )

    # 6. Save final model
    model.save('model/model.h5')

    # 7. Save class labels
    import json
    labels = {v: k for k, v in train_gen.class_indices.items()}
    with open('model/class_labels.json', 'w') as f:
        json.dump(labels, f)

    return history
```

### 5.3 Fine-Tuning Strategy (Progressive Unfreezing)
```python
def progressive_training(model, train_gen, val_gen):
    """
    Phase 1: Train only top layers
    Phase 2: Unfreeze more layers, lower LR
    Phase 3: Full fine-tuning
    """

    # Phase 1: Frozen base
    for layer in model.layers[:-10]:
        layer.trainable = False

    model.compile(optimizer=Adam(1e-3), loss='categorical_crossentropy')
    model.fit(train_gen, validation_data=val_gen, epochs=5)

    # Phase 2: Partial unfreezing
    for layer in model.layers[-30:]:
        layer.trainable = True

    model.compile(optimizer=Adam(1e-4), loss='categorical_crossentropy')
    model.fit(train_gen, validation_data=val_gen, epochs=10)

    # Phase 3: Full fine-tuning
    for layer in model.layers:
        layer.trainable = True

    model.compile(optimizer=Adam(1e-5), loss='categorical_crossentropy')
    model.fit(train_gen, validation_data=val_gen, epochs=15)
```

---

## 6. Evaluation Metrics

### 6.1 Metrics Implementation
```python
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score
)
import matplotlib.pyplot as plt
import seaborn as sns

def evaluate_model(model, test_gen):
    """Generate comprehensive evaluation metrics."""

    # Get predictions
    y_pred_proba = model.predict(test_gen)
    y_pred = np.argmax(y_pred_proba, axis=1)
    y_true = test_gen.classes

    # Class names
    class_names = list(test_gen.class_indices.keys())

    # Classification report
    report = classification_report(
        y_true, y_pred,
        target_names=class_names,
        output_dict=True
    )

    # Macro F1 (primary metric)
    macro_f1 = f1_score(y_true, y_pred, average='macro')

    # Per-class metrics
    per_class_precision = precision_score(y_true, y_pred, average=None)
    per_class_recall = recall_score(y_true, y_pred, average=None)
    per_class_f1 = f1_score(y_true, y_pred, average=None)

    return {
        'macro_f1': macro_f1,
        'report': report,
        'per_class': {
            'precision': dict(zip(class_names, per_class_precision)),
            'recall': dict(zip(class_names, per_class_recall)),
            'f1': dict(zip(class_names, per_class_f1))
        }
    }
```

### 6.2 Confusion Matrix Visualization
```python
def plot_confusion_matrix(y_true, y_pred, class_names, save_path=None):
    """Plot and save confusion matrix."""

    cm = confusion_matrix(y_true, y_pred)
    cm_normalized = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis]

    plt.figure(figsize=(15, 12))
    sns.heatmap(
        cm_normalized,
        annot=True,
        fmt='.2f',
        cmap='Blues',
        xticklabels=class_names,
        yticklabels=class_names
    )
    plt.xlabel('Predicted')
    plt.ylabel('True')
    plt.title('Confusion Matrix (Normalized)')
    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=150)

    plt.show()
```

### 6.3 Misclassification Analysis
```python
def analyze_misclassifications(model, test_gen, top_n=10):
    """
    Identify most common misclassifications.
    """
    predictions = model.predict(test_gen)
    y_pred = np.argmax(predictions, axis=1)
    y_true = test_gen.classes
    confidence = np.max(predictions, axis=1)

    class_names = list(test_gen.class_indices.keys())

    # Find misclassified samples
    misclassified = []
    for i, (true, pred, conf) in enumerate(zip(y_true, y_pred, confidence)):
        if true != pred:
            misclassified.append({
                'index': i,
                'true_class': class_names[true],
                'pred_class': class_names[pred],
                'confidence': conf
            })

    # Most common misclassification pairs
    from collections import Counter
    pairs = [(m['true_class'], m['pred_class']) for m in misclassified]
    common_errors = Counter(pairs).most_common(top_n)

    return {
        'total_errors': len(misclassified),
        'error_rate': len(misclassified) / len(y_true),
        'common_errors': common_errors,
        'misclassified': misclassified[:50]  # First 50 for inspection
    }
```

---

## 7. Model Optimization

### 7.1 Model Compression
```python
# TensorFlow Lite conversion
def convert_to_tflite(model, save_path='model/model.tflite'):
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    tflite_model = converter.convert()

    with open(save_path, 'wb') as f:
        f.write(tflite_model)

    print(f"TFLite model saved: {os.path.getsize(save_path) / 1e6:.2f} MB")
```

### 7.2 ONNX Export
```python
import tf2onnx
import onnx

def convert_to_onnx(model, save_path='model/model.onnx'):
    spec = (tf.TensorSpec((None, 224, 224, 3), tf.float32, name="input"),)
    model_proto, _ = tf2onnx.convert.from_keras(model, input_signature=spec)
    onnx.save(model_proto, save_path)
```

### 7.3 Inference Benchmark
```python
import time

def benchmark_inference(model, test_image, num_runs=100):
    """Benchmark model inference speed."""

    # Warmup
    for _ in range(10):
        model.predict(test_image, verbose=0)

    # Benchmark
    times = []
    for _ in range(num_runs):
        start = time.time()
        model.predict(test_image, verbose=0)
        times.append(time.time() - start)

    return {
        'mean_ms': np.mean(times) * 1000,
        'std_ms': np.std(times) * 1000,
        'min_ms': np.min(times) * 1000,
        'max_ms': np.max(times) * 1000
    }
```

---

## 8. Google Colab Training Template

```python
# ========== AGRIVISION TRAINING NOTEBOOK ==========
# Run this in Google Colab with GPU runtime

# 1. Setup
!pip install -q kaggle tensorflow matplotlib seaborn scikit-learn

# 2. Download dataset
import os
os.makedirs('/root/.kaggle', exist_ok=True)
# Upload kaggle.json first
!cp /content/kaggle.json /root/.kaggle/
!chmod 600 /root/.kaggle/kaggle.json
!kaggle datasets download -d abdallahalidev/plantvillage-dataset
!unzip -q plantvillage-dataset.zip

# 3. Imports
import tensorflow as tf
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras import layers, Model
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping
import numpy as np
import json

# 4. Configuration
CONFIG = {
    'data_dir': '/content/plantvillage dataset/color',
    'img_size': 224,
    'batch_size': 32,
    'epochs': 30,
    'num_classes': 18
}

# 5. Create generators
datagen = ImageDataGenerator(
    rescale=1./255,
    validation_split=0.2,
    rotation_range=20,
    horizontal_flip=True,
    zoom_range=0.2
)

train_gen = datagen.flow_from_directory(
    CONFIG['data_dir'],
    target_size=(CONFIG['img_size'], CONFIG['img_size']),
    batch_size=CONFIG['batch_size'],
    class_mode='categorical',
    subset='training'
)

val_gen = datagen.flow_from_directory(
    CONFIG['data_dir'],
    target_size=(CONFIG['img_size'], CONFIG['img_size']),
    batch_size=CONFIG['batch_size'],
    class_mode='categorical',
    subset='validation'
)

# 6. Build model
base = EfficientNetB0(weights='imagenet', include_top=False, input_shape=(224,224,3))
for layer in base.layers[:-20]:
    layer.trainable = False

x = base.output
x = layers.GlobalAveragePooling2D()(x)
x = layers.Dropout(0.5)(x)
x = layers.Dense(256, activation='relu')(x)
outputs = layers.Dense(CONFIG['num_classes'], activation='softmax')(x)

model = Model(inputs=base.input, outputs=outputs)
model.compile(
    optimizer=tf.keras.optimizers.Adam(1e-4),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

# 7. Train
history = model.fit(
    train_gen,
    validation_data=val_gen,
    epochs=CONFIG['epochs'],
    callbacks=[
        ModelCheckpoint('best_model.h5', save_best_only=True),
        EarlyStopping(patience=5, restore_best_weights=True)
    ]
)

# 8. Save
model.save('agrivision_model.h5')
labels = {v: k for k, v in train_gen.class_indices.items()}
with open('class_labels.json', 'w') as f:
    json.dump(labels, f)

# 9. Download from Colab
from google.colab import files
files.download('agrivision_model.h5')
files.download('class_labels.json')
```

---

## 9. Checkpoints & Milestones

### Training Checkpoints
| Checkpoint | Epochs | Expected F1 | Notes |
|------------|--------|-------------|-------|
| Baseline | 5 | 0.70 | Frozen base, high LR |
| Intermediate | 15 | 0.85 | Partial unfreezing |
| Final | 30 | 0.90+ | Full fine-tuning |

### Evaluation Milestones
- [ ] Model loads successfully
- [ ] All 18 classes recognized
- [ ] Macro F1 > 0.85 (minimum)
- [ ] Macro F1 > 0.90 (target)
- [ ] Inference < 3 seconds
- [ ] Confusion matrix generated
- [ ] Per-class metrics documented

---

*ML Model Training Brainstorm - AgriVision Team*
