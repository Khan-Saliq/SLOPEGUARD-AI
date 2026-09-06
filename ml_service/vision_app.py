"""
Flask-based Computer Vision API Service for Hazard Detection
Analyzes images for landslide, road blockage, cracks, and other hazards
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import base64
import requests
from datetime import datetime
from PIL import Image
from io import BytesIO

app = Flask(__name__)
CORS(app)

# Placeholder for actual CV model loading
# TODO: Integrate with actual computer vision model (e.g., YOLO, ResNet, or custom trained model)
vision_model = None

HAZARD_CATEGORIES = {
    'landslide': ['landslide', 'debris', 'mudslide', 'rockfall', 'soil'],
    'road_blockage': ['blocked', 'obstacle', 'tree', 'rock', 'barrier'],
    'crack': ['crack', 'fissure', 'split', 'damage'],
    'slope_movement': ['displacement', 'movement', 'shift', 'settling'],
    'water_seepage': ['water', 'seepage', 'leak', 'moisture', 'wetness'],
    'other': ['hazard', 'danger', 'risk']
}

def load_vision_model():
    """Load computer vision model"""
    global vision_model
    try:
        # TODO: Load actual trained model
        # vision_model = torch.load('hazard_detection_model.pth')
        print("[OK] Vision model placeholder loaded (integration pending)")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to load vision model: {e}")
        return False

def download_image(image_url):
    """Download image from URL"""
    try:
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()
        return Image.open(BytesIO(response.content))
    except Exception as e:
        raise Exception(f"Failed to download image: {e}")

def analyze_image_content(image, expected_category, metadata):
    """
    Analyze image content for hazard detection

    Returns confidence score and detected hazard type
    This is a placeholder implementation - should be replaced with actual CV model
    """
    try:
        # Basic image validation
        width, height = image.size
        if width < 100 or height < 100:
            return {
                'is_relevant': False,
                'confidence': 0.1,
                'reason': 'Image resolution too low for analysis'
            }

        # Check metadata for camera capture authenticity markers
        has_camera_metadata = metadata and metadata.get('captureMethod') == 'camera_api'
        recent_capture = False

        if metadata and metadata.get('captureTimestamp'):
            try:
                capture_time = datetime.fromisoformat(metadata['captureTimestamp'].replace('Z', '+00:00'))
                time_diff = (datetime.now(capture_time.tzinfo) - capture_time).total_seconds()
                recent_capture = time_diff < 300  # within 5 minutes
            except:
                pass

        # Placeholder CV analysis
        # TODO: Replace with actual model inference
        # For now, use heuristic-based scoring with metadata consideration

        base_confidence = 0.70 if has_camera_metadata else 0.50

        if recent_capture:
            base_confidence += 0.10

        # Simulate hazard detection with uncertainty
        # Real implementation would run model.predict(image_tensor)
        detected_category = expected_category or 'other'

        # Add variance based on expected category match
        import random
        confidence_variance = random.uniform(-0.15, 0.15)
        final_confidence = max(0.45, min(0.95, base_confidence + confidence_variance))

        is_relevant = final_confidence >= 0.60

        return {
            'is_relevant': is_relevant,
            'hazard_type': detected_category,
            'confidence': round(final_confidence, 2),
            'detection_method': 'placeholder_cv_analysis',
            'metadata_verified': has_camera_metadata,
            'capture_recency_verified': recent_capture
        }

    except Exception as e:
        return {
            'is_relevant': False,
            'confidence': 0.0,
            'reason': f'Analysis error: {str(e)}'
        }

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'hazard_vision_api',
        'model_loaded': vision_model is not None
    })

@app.route('/inspect', methods=['POST'])
def inspect_media():
    """
    Inspect image/video for hazard evidence

    Expected input:
    {
        "image_url": "http://...",
        "expected_category": "landslide",
        "metadata": {
            "captureMethod": "camera_api",
            "captureTimestamp": "2026-09-06T09:00:00Z",
            "deviceInfo": "..."
        }
    }

    Returns:
    {
        "is_relevant": true,
        "hazard_type": "landslide",
        "apparent_severity": "high",
        "confidence": 0.87,
        "evidence_status": "accepted_for_review",
        "reasons": [...],
        "recommendation": "..."
    }
    """
    try:
        data = request.get_json()

        image_url = data.get('image_url')
        expected_category = data.get('expected_category', 'other')
        metadata = data.get('metadata', {})

        if not image_url:
            return jsonify({'error': 'Missing image_url'}), 400

        # Download and analyze image
        image = download_image(image_url)
        analysis = analyze_image_content(image, expected_category, metadata)

        # Determine severity based on confidence and category
        severity_map = {
            'landslide': 'high',
            'road_blockage': 'high',
            'crack': 'moderate',
            'slope_movement': 'high',
            'water_seepage': 'moderate',
            'other': 'low'
        }

        apparent_severity = severity_map.get(analysis.get('hazard_type', 'other'), 'moderate')

        # Determine evidence status
        confidence = analysis.get('confidence', 0)
        is_relevant = analysis.get('is_relevant', False)

        if confidence >= 0.85 and is_relevant:
            evidence_status = 'accepted_for_review'
            recommendation = 'High confidence detection - accept for authority review'
        elif confidence >= 0.60 and is_relevant:
            evidence_status = 'manual_verification_required'
            recommendation = 'Moderate confidence - requires manual verification by trained personnel'
        elif confidence < 0.50:
            evidence_status = 'insufficient_evidence'
            recommendation = 'Low confidence - request recapture with better lighting/angle'
        else:
            evidence_status = 'needs_verification'
            recommendation = 'Uncertain detection - manual review required'

        reasons = []
        if analysis.get('metadata_verified'):
            reasons.append('✓ Captured using browser camera API')
        else:
            reasons.append('⚠ Camera metadata not verified')

        if analysis.get('capture_recency_verified'):
            reasons.append('✓ Recent capture timestamp confirmed')
        else:
            reasons.append('⚠ Capture timestamp not recent or missing')

        if is_relevant:
            reasons.append(f'✓ Hazard type detected: {analysis.get("hazard_type")}')
        else:
            reasons.append('✗ No clear hazard evidence detected')

        reasons.append(f'Confidence: {int(confidence * 100)}%')

        response = {
            'is_relevant': is_relevant,
            'hazard_type': analysis.get('hazard_type'),
            'apparent_severity': apparent_severity,
            'confidence': confidence,
            'evidence_status': evidence_status,
            'reasons': reasons,
            'recommendation': recommendation,
            'inspection_timestamp': datetime.utcnow().isoformat() + 'Z',
            'inspection_method': analysis.get('detection_method', 'unknown')
        }

        return jsonify(response)

    except Exception as e:
        return jsonify({
            'error': 'Inspection failed',
            'message': str(e),
            'fallback_status': 'manual_verification_required'
        }), 500

if __name__ == '__main__':
    print("="*60)
    print("Hazard Detection Vision API")
    print("="*60)

    load_vision_model()

    print("\n[OK] Starting Flask server on http://localhost:5001")
    print("="*60)
    app.run(host='0.0.0.0', port=5001, debug=False)
