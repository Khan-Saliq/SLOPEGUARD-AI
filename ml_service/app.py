"""
Flask-based ML Prediction API Service
Serves trained XGBoost model for landslide risk prediction
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import json
import os
import pandas as pd

app = Flask(__name__)
CORS(app)

# Load model and metadata
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(MODEL_DIR, 'landslide_xgboost_model.pkl')
METADATA_PATH = os.path.join(MODEL_DIR, 'model_metadata.json')

model = None
metadata = None

def load_model():
    """Load trained model and metadata"""
    global model, metadata
    try:
        model = joblib.load(MODEL_PATH)
        with open(METADATA_PATH, 'r') as f:
            metadata = json.load(f)
        print(f"[OK] Model loaded: {metadata['model_version']}")
        print(f"[OK] Features: {metadata['features']}")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to load model: {e}")
        return False



# Gunicorn imports app:app and does not execute the __main__ block.
load_model()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'model_version': metadata.get('model_version') if metadata else None
    })

@app.route('/model/info', methods=['GET'])
def model_info():
    """Return model metadata"""
    if metadata is None:
        return jsonify({'error': 'Model not loaded'}), 500
    return jsonify(metadata)

@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict landslide risk from environmental features

    Expected input JSON:
    {
        "elevation": 1430.0,
        "slope": 48.5,
        "rainfall_24h": 120.0,
        "rainfall_72h": 250.0,
        "rainfall_intensity": 15.5,
        "soil_moisture": 85.0,
        "satellite_indicator": 78.0,
        "historical_landslide_occurrence": 92.0
    }

    Returns:
    {
        "risk_level": 3,
        "risk_category": "critical",
        "risk_score": 95.2,
        "confidence": 0.87,
        "probabilities": {
            "low": 0.02,
            "moderate": 0.05,
            "high": 0.06,
            "critical": 0.87
        },
        "model_version": "1.0.0",
        "prediction_timestamp": "2026-09-06T08:41:46Z"
    }
    """
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 500

    try:
        data = request.get_json()

        # Extract features in correct order
        features = metadata['features']
        feature_values = []

        for feat in features:
            if feat not in data:
                return jsonify({'error': f'Missing required feature: {feat}'}), 400
            feature_values.append(float(data[feat]))

        # Prepare input array
        X = np.array([feature_values])

        # Make prediction
        risk_level = int(model.predict(X)[0])
        probabilities = model.predict_proba(X)[0]

        # Map risk level to category
        risk_map = metadata['risk_levels']
        risk_category = risk_map[str(risk_level)]

        # Calculate risk score (0-100 scale based on probabilities)
        risk_score = (
            probabilities[0] * 20 +  # low
            probabilities[1] * 50 +  # moderate
            probabilities[2] * 75 +  # high
            probabilities[3] * 95    # critical
        )

        # Confidence is the probability of predicted class
        confidence = float(probabilities[risk_level])

        response = {
            'risk_level': risk_level,
            'risk_category': risk_category,
            'risk_score': round(float(risk_score), 2),
            'confidence': round(confidence, 4),
            'probabilities': {
                'low': round(float(probabilities[0]), 4),
                'moderate': round(float(probabilities[1]), 4),
                'high': round(float(probabilities[2]), 4),
                'critical': round(float(probabilities[3]), 4)
            },
            'model_version': metadata['model_version'],
            'prediction_timestamp': pd.Timestamp.now().isoformat()
        }

        return jsonify(response)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/predict/batch', methods=['POST'])
def predict_batch():
    """
    Batch prediction for multiple locations

    Expected input JSON:
    {
        "locations": [
            {
                "id": "zone-1",
                "elevation": 1430.0,
                "slope": 48.5,
                ...
            },
            ...
        ]
    }
    """
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 500

    try:
        data = request.get_json()
        locations = data.get('locations', [])

        if not locations:
            return jsonify({'error': 'No locations provided'}), 400

        results = []
        features = metadata['features']

        for loc in locations:
            loc_id = loc.get('id', 'unknown')

            try:
                feature_values = [float(loc[feat]) for feat in features]
                X = np.array([feature_values])

                risk_level = int(model.predict(X)[0])
                probabilities = model.predict_proba(X)[0]
                risk_category = metadata['risk_levels'][str(risk_level)]

                risk_score = (
                    probabilities[0] * 20 +
                    probabilities[1] * 50 +
                    probabilities[2] * 75 +
                    probabilities[3] * 95
                )

                confidence = float(probabilities[risk_level])

                results.append({
                    'id': loc_id,
                    'risk_level': risk_level,
                    'risk_category': risk_category,
                    'risk_score': round(float(risk_score), 2),
                    'confidence': round(confidence, 4)
                })
            except Exception as e:
                results.append({
                    'id': loc_id,
                    'error': str(e)
                })

        return jsonify({
            'predictions': results,
            'model_version': metadata['model_version'],
            'prediction_timestamp': pd.Timestamp.now().isoformat()
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("="*60)
    print("Landslide Risk Prediction API")
    print("="*60)

    if load_model():
        print("\n[OK] Starting Flask server on http://localhost:5000")
        print("="*60)
        app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=False)
    else:
        print("\n[ERROR] Failed to start: Model not loaded")
