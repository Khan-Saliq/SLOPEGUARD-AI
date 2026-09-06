"""
XGBoost Landslide Risk Classifier Training Script
Trains a multi-class classifier: Low (0), Moderate (1), High (2), Critical (3)
"""

import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score
import xgboost as xgb
import joblib
import json

# Feature columns used for prediction
FEATURE_COLS = [
    'elevation',
    'slope',
    'rainfall_24h',
    'rainfall_72h',
    'rainfall_intensity',
    'soil_moisture',
    'satellite_indicator',
    'historical_landslide_occurrence'
]

def load_dataset():
    """Load the generated dataset"""
    dataset_path = os.path.join(os.path.dirname(__file__), 'ner_historical_landslide_dataset.csv')
    df = pd.read_csv(dataset_path)
    print(f"Loaded {len(df)} samples from dataset")
    return df

def train_xgboost_model(df, test_size=0.2, random_state=42):
    """Train XGBoost multi-class classifier"""

    # Prepare features and target
    X = df[FEATURE_COLS].values
    y = df['risk_level'].values  # 0=low, 1=moderate, 2=high, 3=critical

    # Split dataset
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y
    )

    print(f"\nTraining set: {len(X_train)} samples")
    print(f"Test set: {len(X_test)} samples")

    # Train XGBoost classifier
    print("\nTraining XGBoost classifier...")

    model = xgb.XGBClassifier(
        objective='multi:softmax',
        num_class=4,
        max_depth=8,
        learning_rate=0.1,
        n_estimators=200,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=random_state,
        eval_metric='mlogloss',
        early_stopping_rounds=20
    )

    # Train with evaluation set
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False
    )

    # Predictions
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)

    # Evaluation metrics
    accuracy = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average='weighted')

    print(f"\n{'='*60}")
    print("MODEL EVALUATION RESULTS")
    print(f"{'='*60}")
    print(f"Accuracy: {accuracy:.4f}")
    print(f"Weighted F1-Score: {f1:.4f}")

    print("\nClassification Report:")
    target_names = ['Low', 'Moderate', 'High', 'Critical']
    print(classification_report(y_test, y_pred, target_names=target_names))

    print("\nConfusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(cm)

    # Feature importance
    print("\nFeature Importance:")
    feature_importance = pd.DataFrame({
        'feature': FEATURE_COLS,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    print(feature_importance.to_string(index=False))

    return model, accuracy, f1, feature_importance

def save_model(model, feature_importance):
    """Save trained model and metadata"""
    out_dir = os.path.dirname(os.path.abspath(__file__))

    # Save model
    model_path = os.path.join(out_dir, 'landslide_xgboost_model.pkl')
    joblib.dump(model, model_path)
    print(f"\n[OK] Model saved to: {model_path}")

    # Save model metadata
    metadata = {
        'model_type': 'XGBoost Multi-class Classifier',
        'model_version': '1.0.0',
        'trained_at': pd.Timestamp.now().isoformat(),
        'features': FEATURE_COLS,
        'risk_levels': {
            0: 'low',
            1: 'moderate',
            2: 'high',
            3: 'critical'
        },
        'feature_importance': feature_importance.to_dict('records')
    }

    metadata_path = os.path.join(out_dir, 'model_metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"[OK] Metadata saved to: {metadata_path}")

def main():
    print("="*60)
    print("XGBoost Landslide Risk Classification Training")
    print("="*60)

    # Load dataset
    df = load_dataset()

    # Train model
    model, accuracy, f1, feature_importance = train_xgboost_model(df)

    # Save model
    save_model(model, feature_importance)

    print(f"\n{'='*60}")
    print("TRAINING COMPLETE")
    print(f"{'='*60}")
    print(f"Final Accuracy: {accuracy:.4f}")
    print(f"Final F1-Score: {f1:.4f}")
    print("\nModel ready for deployment!")

if __name__ == "__main__":
    main()
