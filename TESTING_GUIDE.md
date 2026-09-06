# Testing Guide - SlopeGuard AI Web Application

## Prerequisites

Before testing, ensure all services are running:

```bash
# Terminal 1 - Backend Server
cd server
npm install
node index.js

# Terminal 2 - ML Risk Service
cd ml_service
pip install -r requirements.txt
python app.py

# Terminal 3 - ML Vision Service
cd ml_service
python vision_app.py

# Terminal 4 - Frontend
npm install
npm run dev:frontend
```

Or use the all-in-one script (Git Bash on Windows):
```bash
chmod +x start-all.sh
./start-all.sh
```

## Service URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000
- **ML Risk Service**: http://localhost:5000/health
- **ML Vision API**: http://localhost:5001/health

## Test Account

Use the signup page or create an account:
- Navigate to http://localhost:5173/signup
- Create citizen or authority account
- Login at http://localhost:5173/login

---

## Test 1: Camera-Only Hazard Reporting

### Objective
Verify that the Report Hazard page uses browser camera API exclusively (no file uploads).

### Steps

1. **Navigate to Report Page**
   - Login as citizen
   - Click "Report Hazard" or navigate to `/report`

2. **Test Camera Permission**
   - Select a hazard category (e.g., "Landslide")
   - Click "Continue to Camera Capture"
   - Click "Capture Photo" button
   - **Expected**: Browser prompts for camera permission
   - **Expected**: Clear message if permission denied
   - **Expected**: Clear message if camera unavailable

3. **Grant Camera Permission**
   - Allow camera access when prompted
   - **Expected**: Live camera preview appears
   - **Expected**: "Camera Active" indicator shown

4. **Capture Photo**
   - Click the round camera button at bottom center
   - **Expected**: Photo captured and shown in preview
   - **Expected**: "Retake Photo" and "Use This Photo" buttons appear

5. **Verify Camera Metadata**
   - Confirm the photo
   - Wait for AI analysis to complete
   - **Expected**: AI inspection results show:
     - "✓ Captured using browser camera API"
     - Confidence score displayed
     - Capture timestamp shown
     - Device info recorded

6. **Test Video Recording**
   - Go back and select "Record Video" instead
   - **Expected**: Camera opens with recording button
   - Click record button
   - **Expected**: Recording indicator appears (red dot + timer)
   - Click stop button
   - **Expected**: Video preview shown

7. **Verify No File Upload**
   - **Expected**: NO "Choose File" button
   - **Expected**: NO "Upload from Gallery" option
   - **Expected**: NO `<input type="file">` visible in normal flow

### Pass Criteria
- ✅ Camera opens using browser API
- ✅ Permission prompts work correctly
- ✅ Error messages shown for denied/unavailable
- ✅ Live camera preview displayed
- ✅ Photo capture works
- ✅ Video recording works
- ✅ Metadata includes "camera_api" flag
- ✅ Timestamp captured
- ✅ No file upload UI visible

---

## Test 2: AI Media Inspection

### Objective
Verify AI inspection analyzes media and provides confidence-based recommendations.

### Steps

1. **Submit Photo Report**
   - Capture a photo using camera
   - Wait for AI analysis animation
   - **Expected**: Loading animation shows:
     - "Scanning image features..."
     - "Verifying camera metadata..."
     - "Detecting hazard type..."
     - "Calculating confidence score..."

2. **Review AI Results**
   - Check the inspection results card
   - **Expected**: Shows one of:
     - ✅ Green: High confidence (≥85%) - "Accepted for review"
     - ⚠️ Amber: Moderate (60-84%) - "Manual verification required"
     - ❌ Red: Low (<60%) - "Insufficient evidence"

3. **Verify AI Response Fields**
   - **Expected**: Results include:
     - Confidence percentage
     - Detected hazard category
     - Severity level (low/moderate/high/critical)
     - Recommendation text
     - Reasons list
     - Camera metadata verification status

4. **Test Rejection Scenario**
   - If confidence is low, **Expected**:
     - Clear rejection message
     - Reason for rejection
     - Option to retake photo

5. **Test Manual Verification**
   - If confidence is moderate, **Expected**:
     - Warning that manual review needed
     - Report still submittable
     - Clear disclaimer shown

### Pass Criteria
- ✅ AI analysis runs (not just accepted automatically)
- ✅ Confidence score calculated
- ✅ Different statuses for different confidence levels
- ✅ Clear reasons provided
- ✅ Low confidence = rejection/retake suggested
- ✅ Metadata verification considered
- ✅ No hardcoded responses

---

## Test 3: Safe Route Calculation

### Objective
Verify routing uses real road networks and shows actual distance/time.

### Steps

1. **Navigate to Safe Route Page**
   - Click "Safe Route" in navigation
   - Or navigate to `/safe-route`

2. **Enter Route Details**
   - Origin: "Shillong, Meghalaya"
   - Destination: "Tura, Meghalaya"
   - Click "Find Route"
   - **Expected**: Loading indicator appears

3. **Verify Route Calculation**
   - Wait for route calculation (may take 3-10 seconds)
   - **Expected**: Route appears on map
   - **Expected**: Route follows actual roads (NOT straight line)
   - **Expected**: Blue polyline drawn on map

4. **Check Route Information**
   - **Expected**: Distance shown in kilometers
   - **Expected**: Estimated time shown in hours
   - **Expected**: Start and end markers on map
   - **Expected**: Route summary displayed

5. **Test Turn-by-Turn Instructions**
   - Click "View Turn-by-Turn Instructions"
   - **Expected**: List of navigation steps shown
   - **Expected**: Distance and time per step

6. **Test Hazard Warnings**
   - **Expected**: Safety information box appears
   - **Expected**: Shows one of:
     - ✓ "Route clear of known hazards"
     - ⚠️ "Route passes near moderate risk areas"
     - ⚠️ "WARNING: Route passes near high-risk zones"
   - **Expected**: Disclaimer about data limitations

7. **Test Quick Select**
   - Click a quick-select isolated village button
   - **Expected**: Destination auto-filled
   - Recalculate route
   - **Expected**: New route shown

### Pass Criteria
- ✅ Route uses real roads (not straight line)
- ✅ Distance calculated accurately
- ✅ Time estimate shown
- ✅ Map displays route polyline
- ✅ Start/end markers visible
- ✅ Turn-by-turn instructions available
- ✅ Hazard warnings displayed
- ✅ Disclaimers shown

---

## Test 4: Hazard-Aware Routing

### Objective
Verify routing considers blocked roads and hazard zones.

### Steps

1. **Check Blocked Roads**
   - Navigate to `/roads` (authority account)
   - Note any blocked roads in the list
   - Remember their locations

2. **Calculate Route Through Hazard**
   - Go to Safe Route page
   - Enter route that would pass near blocked road
   - Calculate route
   - **Expected**: Warning about nearby hazards
   - **Expected**: Hazard markers on map

3. **Review Safety Warnings**
   - **Expected**: Warning box shows:
     - "⚠️ Route passes near [hazard name]"
     - Severity level
     - Safety recommendations
   - **Expected**: NOT claiming route is "completely safe"
   - **Expected**: Advice to "check with local authorities"

4. **Test Without Hazard Data**
   - If no blocked roads exist, **Expected**:
     - "ℹ️ Real-time hazard data unavailable"
     - "Route shown is based on road network only"
     - Clear limitation disclaimer

### Pass Criteria
- ✅ Hazard zones marked on map
- ✅ Proximity warnings shown
- ✅ Severity-based warnings
- ✅ Clear disclaimers
- ✅ No false "completely safe" claims
- ✅ Recommends checking authorities

---

## Test 5: Admin Roads Page

### Objective
Verify admin page has routing capabilities.

### Steps

1. **Access Admin Page**
   - Login as authority user
   - Navigate to `/roads`

2. **View Road Status**
   - **Expected**: Metrics cards showing:
     - Blocked Roads count
     - Vulnerable Roads count
     - Operational Routes count
     - Isolated Villages count

3. **Use Route Calculator**
   - Scroll to "Safe Route Planner" section
   - **Expected**: Same routing interface as citizen page
   - Enter origin and destination
   - Calculate route
   - **Expected**: Route shown on map

4. **Review Route for Emergency**
   - Check distance and time
   - Review hazard warnings
   - **Expected**: Information suitable for dispatch decisions

### Pass Criteria
- ✅ Admin page has routing calculator
- ✅ Same features as citizen page
- ✅ Real road routing works
- ✅ Distance and time shown
- ✅ Hazard warnings displayed

---

## Test 6: GPS Location Capture

### Objective
Verify GPS location is captured with reports.

### Steps

1. **Start New Report**
   - Navigate to `/report`
   - **Expected**: Default location shown

2. **Update GPS Location**
   - Click "Update" button next to GPS section
   - **Expected**: Browser asks for location permission
   - Grant permission
   - **Expected**: Location updates with:
     - Latitude and longitude
     - Accuracy (± meters)
     - Area/city/district info (if available)

3. **Submit Report with GPS**
   - Complete hazard report with photo
   - Submit report
   - **Expected**: Report includes GPS coordinates

### Pass Criteria
- ✅ GPS permission requested
- ✅ Location captured
- ✅ Accuracy shown
- ✅ Coordinates displayed
- ✅ Location saved with report

---

## Test 7: Offline Mode (Optional)

### Objective
Verify offline queue works when network unavailable.

### Steps

1. **Simulate Offline**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Enable "Offline" mode

2. **Submit Report Offline**
   - Create hazard report
   - Capture photo
   - **Expected**: "Offline Mode Active" indicator shown
   - Submit report
   - **Expected**: "Report Saved Offline!" message
   - **Expected**: Report queued locally

3. **Restore Online**
   - Disable offline mode in DevTools
   - Refresh page
   - **Expected**: Queued report syncs automatically

### Pass Criteria
- ✅ Offline indicator shown
- ✅ Reports save locally
- ✅ Auto-sync when online
- ✅ User notified of offline status

---

## Test 8: Browser Compatibility

### Objective
Test across different browsers.

### Browsers to Test
- ✅ Chrome/Edge (Windows)
- ✅ Firefox (Windows)
- ✅ Safari (Mac/iOS if available)
- ✅ Mobile Chrome (Android)
- ✅ Mobile Safari (iOS)

### Test Each Browser
1. Camera access works
2. GPS works
3. Routing map displays
4. Route calculation works

### Known Limitations
- Camera API requires HTTPS (except localhost)
- Older browsers may not support getUserMedia
- Some mobile browsers have limited camera API support

---

## Troubleshooting

### Camera not working
- **Check**: HTTPS enabled (or using localhost)
- **Check**: Browser supports getUserMedia
- **Check**: Camera permission granted in browser settings
- **Try**: Reload page and re-grant permission

### Routing fails
- **Check**: Internet connection active
- **Check**: Valid addresses entered
- **Check**: OpenRouteService API accessible
- **Try**: Use different origin/destination
- **Check**: Browser console for errors

### AI inspection fails
- **Check**: ML Vision service running on port 5001
- **Check**: Backend can reach ML service
- **Fallback**: Rule-based assessment used automatically
- **Check**: Image uploaded successfully

### Build errors
- **Run**: `npm install` to ensure dependencies installed
- **Check**: Node.js version (should be 18+)
- **Check**: TypeScript version matches package.json
- **Run**: `npm run build` to see detailed errors

---

## Success Checklist

### Camera Capture ✓
- [ ] Camera opens via browser API
- [ ] Live preview shown
- [ ] Photo capture works
- [ ] Video recording works
- [ ] Permission handling correct
- [ ] Error messages clear
- [ ] No file upload buttons
- [ ] Metadata captured

### AI Inspection ✓
- [ ] Analysis runs on submission
- [ ] Confidence score shown
- [ ] Accept/reject decisions made
- [ ] Manual verification option exists
- [ ] Reasons displayed
- [ ] Not hardcoded responses

### Routing ✓
- [ ] Real road routes calculated
- [ ] Distance shown in km
- [ ] Time shown in hours
- [ ] Map displays route
- [ ] Turn-by-turn available
- [ ] Hazard warnings shown
- [ ] Disclaimers present

### Admin Features ✓
- [ ] Roads page has routing
- [ ] Same features as citizen
- [ ] Dispatch-ready information

### Integration ✓
- [ ] GPS capture works
- [ ] Reports submit successfully
- [ ] Offline mode functional
- [ ] Multi-browser compatible

---

## Performance Benchmarks

### Expected Load Times
- Camera open: < 2 seconds
- Route calculation: 3-10 seconds (depends on API)
- AI inspection: 2-5 seconds
- Image upload: < 3 seconds (1-2MB image)

### API Rate Limits
- OpenRouteService free tier: 2000 requests/day
- OSRM: No rate limit (public instance)
- Backend: No artificial limits

---

## Report Issues

If tests fail, collect:
1. Browser and version
2. Operating system
3. Console errors (F12 → Console tab)
4. Network errors (F12 → Network tab)
5. Screenshots of error messages
6. Steps to reproduce

Document in project issues or share with development team.
