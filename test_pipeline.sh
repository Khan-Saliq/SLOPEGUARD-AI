#!/bin/bash
# End-to-End Pipeline Test Script
# Tests: Real APIs → Data Processing → XGBoost → Risk Prediction → Alerts

echo "=========================================="
echo "SlopeGuard AI - End-to-End Pipeline Test"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Test 1: ML Service Health Check
echo -e "${YELLOW}[TEST 1]${NC} ML Service Health Check (http://localhost:5000/health)"
RESPONSE=$(curl -s http://localhost:5000/health)
if echo "$RESPONSE" | grep -q "healthy"; then
    echo -e "${GREEN}✓ PASSED${NC} - ML service is healthy"
    echo "   Response: $RESPONSE"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} - ML service not responding"
    ((FAILED++))
fi
echo ""

# Test 2: ML Model Info
echo -e "${YELLOW}[TEST 2]${NC} ML Model Metadata (http://localhost:5000/model/info)"
RESPONSE=$(curl -s http://localhost:5000/model/info)
if echo "$RESPONSE" | grep -q "XGBoost"; then
    echo -e "${GREEN}✓ PASSED${NC} - Model info retrieved"
    echo "$RESPONSE" | python -m json.tool 2>/dev/null | head -20
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} - Model info not available"
    ((FAILED++))
fi
echo ""

# Test 3: Direct ML Prediction
echo -e "${YELLOW}[TEST 3]${NC} Direct ML Prediction (Critical Risk Test)"
PREDICTION=$(curl -s -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "elevation": 1305,
    "slope": 48,
    "rainfall_24h": 185,
    "rainfall_72h": 320,
    "rainfall_intensity": 25,
    "soil_moisture": 88,
    "satellite_indicator": 85,
    "historical_landslide_occurrence": 95
  }')

if echo "$PREDICTION" | grep -q "risk_category"; then
    RISK_CATEGORY=$(echo "$PREDICTION" | python -c "import sys, json; print(json.load(sys.stdin)['risk_category'])" 2>/dev/null)
    RISK_SCORE=$(echo "$PREDICTION" | python -c "import sys, json; print(json.load(sys.stdin)['risk_score'])" 2>/dev/null)
    CONFIDENCE=$(echo "$PREDICTION" | python -c "import sys, json; print(json.load(sys.stdin)['confidence'])" 2>/dev/null)

    echo -e "${GREEN}✓ PASSED${NC} - Prediction successful"
    echo "   Risk Category: $RISK_CATEGORY"
    echo "   Risk Score: $RISK_SCORE"
    echo "   Model Confidence: $CONFIDENCE"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} - Prediction failed"
    ((FAILED++))
fi
echo ""

# Test 4: Real Weather Data Fetch (Open-Meteo API)
echo -e "${YELLOW}[TEST 4]${NC} Real Weather Data Fetch (Cherrapunji: 25.27, 91.73)"
echo "   Testing Open-Meteo API integration..."
WEATHER_TEST=$(curl -s "https://api.open-meteo.com/v1/forecast?latitude=25.27&longitude=91.73&current=temperature_2m,precipitation&hourly=precipitation&past_days=1" | head -c 200)
if echo "$WEATHER_TEST" | grep -q "temperature"; then
    echo -e "${GREEN}✓ PASSED${NC} - Open-Meteo API responding"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} - Weather API not responding"
    ((FAILED++))
fi
echo ""

# Test 5: Real Elevation Data Fetch (Open-Elevation API)
echo -e "${YELLOW}[TEST 5]${NC} Real Elevation Data Fetch (Open-Elevation API)"
ELEVATION_TEST=$(curl -s "https://api.open-elevation.com/api/v1/lookup?locations=25.27,91.73")
if echo "$ELEVATION_TEST" | grep -q "elevation"; then
    ELEV=$(echo "$ELEVATION_TEST" | python -c "import sys, json; print(json.load(sys.stdin)['results'][0]['elevation'])" 2>/dev/null)
    echo -e "${GREEN}✓ PASSED${NC} - Open-Elevation API responding"
    echo "   Cherrapunji Elevation: ${ELEV}m"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} - Elevation API not responding"
    ((FAILED++))
fi
echo ""

# Test 6: Backend Health Check
echo -e "${YELLOW}[TEST 6]${NC} Backend Express Server Health (http://localhost:4000/health)"
BACKEND_HEALTH=$(curl -s http://localhost:4000/health)
if echo "$BACKEND_HEALTH" | grep -q "ok"; then
    echo -e "${GREEN}✓ PASSED${NC} - Backend server healthy"
    echo "   Response: $BACKEND_HEALTH"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} - Backend server not responding"
    echo "   Make sure to run: cd server && npm run dev"
    ((FAILED++))
fi
echo ""

# Test 7: Login & Get Token
echo -e "${YELLOW}[TEST 7]${NC} Authentication Test (Login as admin)"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "adminpass"}')

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin)['token'])" 2>/dev/null)
    echo -e "${GREEN}✓ PASSED${NC} - Authentication successful"
    echo "   Token obtained (${#TOKEN} chars)"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} - Authentication failed"
    echo "   Response: $LOGIN_RESPONSE"
    ((FAILED++))
    TOKEN=""
fi
echo ""

if [ -z "$TOKEN" ]; then
    echo -e "${RED}Cannot proceed with remaining tests - no auth token${NC}"
    echo ""
    echo "=========================================="
    echo "TEST SUMMARY"
    echo "=========================================="
    echo -e "Passed: ${GREEN}${PASSED}${NC}"
    echo -e "Failed: ${RED}${FAILED}${NC}"
    exit 1
fi

# Test 8: Backend ML Status Check
echo -e "${YELLOW}[TEST 8]${NC} Backend ML Status Endpoint"
ML_STATUS=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/ml/status)
if echo "$ML_STATUS" | grep -q "model_loaded"; then
    echo -e "${GREEN}✓ PASSED${NC} - Backend can communicate with ML service"
    echo "$ML_STATUS" | python -m json.tool 2>/dev/null
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} - Backend ML status check failed"
    ((FAILED++))
fi
echo ""

# Test 9: Risk Zones Refresh (Full Pipeline Test)
echo -e "${YELLOW}[TEST 9]${NC} Complete Pipeline: Fetch Real Data + ML Prediction + Alerts"
echo "   This will fetch real weather/elevation data and run XGBoost predictions..."
echo "   (This may take 10-30 seconds due to API rate limiting)"

REFRESH_RESPONSE=$(curl -s -X POST http://localhost:4000/api/risk-zones/refresh \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

if echo "$REFRESH_RESPONSE" | grep -q "success"; then
    UPDATED=$(echo "$REFRESH_RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin).get('updated', 0))" 2>/dev/null)
    NEW_ALERTS=$(echo "$REFRESH_RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin).get('new_alerts', 0))" 2>/dev/null)

    echo -e "${GREEN}✓ PASSED${NC} - Risk zones refreshed with real data & ML predictions"
    echo "   Zones Updated: $UPDATED"
    echo "   New Alerts Generated: $NEW_ALERTS"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} - Risk zone refresh failed"
    echo "   Response: $REFRESH_RESPONSE"
    ((FAILED++))
fi
echo ""

# Test 10: Verify Updated Risk Zones
echo -e "${YELLOW}[TEST 10]${NC} Verify Risk Zones Have Real Data & ML Predictions"
ZONES=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/risk-zones)
if echo "$ZONES" | grep -q "dataSource"; then
    echo -e "${GREEN}✓ PASSED${NC} - Risk zones contain real data and ML metadata"
    echo "$ZONES" | python -c "
import sys, json
zones = json.load(sys.stdin)
if zones and len(zones) > 0:
    z = zones[0]
    print(f\"   Sample Zone: {z.get('name', 'Unknown')}\")
    print(f\"   Risk Level: {z.get('riskLevel', 'N/A')}\")
    print(f\"   Risk Score: {z.get('riskScore', 'N/A')}\")
    print(f\"   Data Source: {z.get('dataSource', 'N/A')}\")
    print(f\"   Model Version: {z.get('modelVersion', 'N/A')}\")
    print(f\"   Rainfall 24h: {z.get('rainfall_24h', 'N/A')}mm\")
    print(f\"   Elevation: {z.get('elevation', 'N/A')}m\")
    print(f\"   Confidence: {z.get('confidence', 'N/A')}\")
" 2>/dev/null
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} - Risk zones missing real data fields"
    ((FAILED++))
fi
echo ""

echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo -e "Passed: ${GREEN}${PASSED}${NC} / 10"
echo -e "Failed: ${RED}${FAILED}${NC} / 10"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
    echo "Complete pipeline working: Real APIs → Data Processing → XGBoost → Predictions → Alerts"
    exit 0
else
    echo -e "${YELLOW}⚠ Some tests failed. Check logs above.${NC}"
    exit 1
fi
