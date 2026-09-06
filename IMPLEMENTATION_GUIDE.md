# SLOPEGUARD AI - Web Application Implementation Summary

## Camera-Only Hazard Reporting

### Implementation
- **Browser Camera API**: Uses `navigator.mediaDevices.getUserMedia()` for live camera access
- **Component**: `CameraCapture.tsx` - Handles photo/video capture with proper permission handling
- **Capture Flow**:
  1. User selects hazard category and confirms GPS location
  2. Opens camera using browser API (not file input)
  3. Captures live photo or records video
  4. Preview and confirm before submission
  5. Uploads to backend with timestamp and metadata
  6. AI inspection analyzes the media
  7. Report submitted based on AI confidence

### Camera Features
- Real-time video preview
- Photo capture with confirmation
- Video recording with duration counter
- Switch between front/back camera (mobile)
- Handles permission denied gracefully
- Shows clear error messages for unsupported browsers
- Captures metadata: timestamp, device info, capture method

### Browser Limitations
- Cannot guarantee 100% prevention of gallery uploads (browser/OS dependent)
- Strongest practical camera-only experience implemented
- Metadata includes "camera_api" flag for verification
- AI assesses authenticity based on metadata and recency

## AI Media Inspection

### Backend Service
- **File**: `ml_service/vision_app.py` - Flask API on port 5001
- **Endpoint**: `/api/inspect-media` - Analyzes uploaded media
- **Response Fields**:
  ```json
  {
    "is_relevant": true,
    "hazard_type": "landslide",
    "apparent_severity": "high",
    "confidence": 0.87,
    "evidence_status": "accepted_for_review",
    "reasons": ["✓ Captured using browser camera API", ...],
    "recommendation": "High confidence detection - accept for review"
  }
  ```

### Confidence Levels
- **≥85%**: Accepted for review (high confidence)
- **60-84%**: Manual verification required (moderate confidence)
- **<60%**: Insufficient evidence (low confidence, request recapture)

### Important Notes
- Does NOT automatically accept all images
- AI confidence is treated as assessment, not absolute proof
- Manual verification available for uncertain cases
- Metadata verification improves confidence
- Fallback to rule-based assessment if ML service unavailable

## Safe Route Planning

### Implementation
- **Service**: `lib/routingService.ts` - Real road routing integration
- **Primary API**: OpenRouteService (free tier: 2000 req/day)
- **Fallback API**: OSRM (free public instance)
- **Map Display**: Leaflet + React-Leaflet for interactive map

### Route Features
- Geocoding: Converts addresses to coordinates (Nominatim)
- Real road routing: Uses actual road networks (not straight lines)
- Distance and time estimates
- Turn-by-turn instructions (when available)
- Interactive map with route polyline
- Start/end markers
- Hazard zone markers

### Hazard-Aware Routing
```
Start + Destination
        ↓
Geocode addresses to coordinates
        ↓
Call routing API (ORS/OSRM)
        ↓
Analyze route proximity to hazard zones
        ↓
Calculate risk segments
        ↓
Display route with safety warnings
```

### Safety Warnings
- ✓ Route clear of known hazards
- ⚠️ Route passes near moderate risk areas
- ⚠️ Route passes near HIGH RISK zones (critical warning)
- ℹ️ Disclaimers about data limitations

### Important Notes
- Does NOT claim routes are "completely safe"
- Clearly states data limitations
- Warns when no safe alternative available
- Uses real-time blocked road data when available
- Shows distance from hazard zones

## Admin Roads Page

### Features
- Same routing calculator as citizen page
- View blocked, vulnerable, and operational roads
- See isolated villages
- Calculate emergency relief routes
- Analyze route safety for dispatch decisions
- Real distance and time estimates
- Turn-by-turn navigation support

## Testing Requirements

### Camera Testing Checklist
✅ Camera permission granted flow
✅ Camera permission denied error message
✅ Camera unavailable error message
✅ Live photo capture
✅ Live video recording
✅ No gallery upload button in main UI
✅ Metadata includes "camera_api" flag
✅ Capture timestamp recorded

### AI Inspection Testing Checklist
✅ AI service reachable
✅ Confidence score calculation
✅ Acceptance/rejection based on confidence
✅ Manual verification for uncertain cases
✅ Fallback when AI unavailable
✅ Metadata verification

### Routing Testing Checklist
✅ Address geocoding works
✅ Route calculation returns real roads
✅ Distance and time displayed
✅ Map shows route polyline
✅ Hazard zones marked on map
✅ Safety warnings displayed
✅ Turn-by-turn instructions available
✅ Handles routing errors gracefully

## Running the Application

### Start Backend Server
```bash
cd landslide-monitor/server
npm install
npm run dev
```

### Start ML Risk Service (Port 5000)
```bash
cd landslide-monitor/ml_service
pip install -r requirements.txt
python app.py
```

### Start ML Vision Service (Port 5001)
```bash
cd landslide-monitor/ml_service
pip install -r requirements.txt
python vision_app.py
```

### Start Frontend
```bash
cd landslide-monitor
npm install
npm run dev:frontend
```

### Or Start Everything
```bash
cd landslide-monitor
npm run dev
```

## Environment Variables

### Optional API Keys
```env
# .env file
VITE_ORS_API_KEY=your_openrouteservice_api_key
```

Get free API key at: https://openrouteservice.org/dev/#/signup

### ML Service URLs
```env
ML_SERVICE_URL=http://127.0.0.1:5000
ML_VISION_URL=http://127.0.0.1:5001
```

## Key Files

### Camera Capture
- `src/components/camera/CameraCapture.tsx` - Browser camera component
- `src/pages/ReportHazardPage.tsx` - Updated reporting flow

### AI Inspection
- `ml_service/vision_app.py` - Computer vision API service
- `server/index.js` - Backend integration (`/api/inspect-media`)

### Routing
- `src/lib/routingService.ts` - Routing service integration
- `src/components/map/SafeRouteCalculator.tsx` - Route planner component
- `src/pages/SafeRoutePage.tsx` - Citizen route page
- `src/pages/RoadsPage.tsx` - Admin roads page

## Browser Compatibility

### Camera API Support
- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Safari (iOS 11+, macOS)
- ⚠️ Requires HTTPS (except localhost)
- ❌ Old browsers (IE, old Android)

### Geolocation API Support
- ✅ All modern browsers
- ⚠️ Requires HTTPS (except localhost)
- ⚠️ User must grant permission

## Security & Privacy

### Camera Access
- Explicit permission request
- No automatic capture
- User controls when camera activates
- Camera indicator shown in browser
- Stream stopped when not in use

### Data Handling
- Metadata includes capture timestamp
- Device info captured (user agent)
- No PII in metadata
- Images uploaded to server after user confirmation
- Offline queue stored locally (IndexedDB/LocalStorage)

## Limitations & Disclaimers

### Camera Capture
- Browser-based solution cannot guarantee 100% prevention of gallery uploads
- Relies on browser API behavior (varies by browser/OS)
- Strongest practical implementation for web applications
- Metadata verification improves authenticity confidence

### AI Inspection
- AI confidence is assessment, not proof of authenticity
- Manual verification available for uncertain cases
- Service may be offline (fallback provided)
- Not a replacement for human review

### Route Safety
- Routes based on available data (may be outdated)
- Cannot guarantee complete safety
- Real-time conditions may differ
- Users should verify with local authorities
- Clearly disclaims limitations

## Production Recommendations

### AI Model Integration
Replace placeholder in `vision_app.py` with actual trained model:
- Use YOLO/ResNet/EfficientNet for object detection
- Train on landslide/road blockage/crack datasets
- Implement proper feature extraction
- Add confidence calibration

### Routing API
- Register for OpenRouteService API key (free tier: 2000/day)
- Consider premium tier for high-traffic applications
- Implement rate limiting and caching
- Add offline routing fallback

### Security
- Enable HTTPS in production (required for camera/GPS APIs)
- Implement rate limiting on upload endpoints
- Add file size limits (currently 50MB)
- Scan uploads for malware
- Add CORS restrictions

### Performance
- Optimize image compression before upload
- Implement progressive image loading
- Cache routing results
- Add service worker for offline support
- Lazy load map components

## Testing Access

### Test Credentials
Use the signup page or login with existing account.

### Test Flows
1. **Report Hazard**: Navigate to `/report` → Select category → Capture photo → Review AI result → Submit
2. **Safe Route**: Navigate to `/safe-route` → Enter origin/destination → Calculate route → View map
3. **Admin Roads**: Login as authority → Navigate to `/roads` → View blocked roads → Calculate emergency route
