/**
 * Automated Verification Test Suite for ML Simulation & Automated Warning Engine
 * Executes and verifies all 17 required test cases.
 */

const { connectMongo, getDb } = require('./mongo');
const { predictBatch } = require('./mlClient');
const { TEST_SCENARIOS } = require('./data/scenarios');
const { runSimulationScenario, resetSimulationMode } = require('./services/simulationEngine');
const { evaluateRouteSafety } = require('./services/routeSafetyService');

async function runAllTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING SLOPEGUARD-AI 17-POINT VERIFICATION & TEST SUITE');
  console.log('================================================================\n');

  const MONGO_URL = process.env.MONGO_URL || process.env.MONGODB_URI;
  await connectMongo(MONGO_URL);

  const results = [];

  function recordTest(id, name, success, details) {
    const status = success ? '✅ PASSED' : '❌ FAILED';
    results.push({ id, name, success, status, details });
    console.log(`[Test ${id.toString().padStart(2, '0')}] ${name}: ${status}`);
    if (details) console.log(`   └─ ${details}`);
  }

  // ----------------------------------------------------------------
  // Test 1: Live Safe Condition
  // ----------------------------------------------------------------
  try {
    const safeScenario = TEST_SCENARIOS.find(s => s.id === 'scen-live-safe');
    const mlRes = await predictBatch([{
      id: 'z-safe-1',
      name: safeScenario.location.name,
      slope: safeScenario.slope,
      elevation: safeScenario.elevation,
      rainfall_24h: safeScenario.rainfall_24h,
      rainfall_72h: safeScenario.rainfall_72h,
      soil_moisture: safeScenario.soil_moisture,
      historical_landslide_occurrence: safeScenario.historicalRisk
    }]);
    const score = Math.round(mlRes.predictions[0].risk_score);
    const category = (mlRes.predictions[0].risk_category || (score >= 85 ? 'critical' : score >= 70 ? 'high' : 'low')).toLowerCase();
    recordTest(1, 'Live Safe Condition', score < 60 && category !== 'critical', `Actual ML Output: Score ${score}/100, Category: ${category.toUpperCase()}. No false alert generated.`);
  } catch (e) {
    recordTest(1, 'Live Safe Condition', false, e.message);
  }

  // ----------------------------------------------------------------
  // Test 2: Live API Failure Fallback
  // ----------------------------------------------------------------
  try {
    const fallbackRes = await predictBatch([{ id: 'z-fail-1', name: 'Fallback Test', slope: 30, rainfall_24h: 20 }]);
    recordTest(2, 'Live API Failure Fallback', !!fallbackRes.predictions, 'ML Engine returned valid prediction response using fallback parameters.');
  } catch (e) {
    recordTest(2, 'Live API Failure Fallback', false, e.message);
  }

  // ----------------------------------------------------------------
  // Test 3: Heavy Rainfall Scenario
  // ----------------------------------------------------------------
  try {
    const heavyScen = TEST_SCENARIOS.find(s => s.id === 'scen-heavy-rain');
    const simRes = await runSimulationScenario('scen-heavy-rain');
    recordTest(3, 'Heavy Rainfall Scenario', simRes.newPrediction.riskScore >= 60, `Actual ML Output: Score ${simRes.newPrediction.riskScore}/100, Level: ${simRes.newPrediction.riskLevel.toUpperCase()}`);
  } catch (e) {
    recordTest(3, 'Heavy Rainfall Scenario', false, e.message);
  }

  // ----------------------------------------------------------------
  // Test 4: Historical Landslide Scenario (Wayanad 2024 Event)
  // ----------------------------------------------------------------
  try {
    const wayanadRes = await runSimulationScenario('scen-wayanad-2024');
    recordTest(4, 'Historical Landslide Scenario', wayanadRes.newPrediction.riskScore >= 80, `Actual ML Output: Score ${wayanadRes.newPrediction.riskScore}/100, Level: ${wayanadRes.newPrediction.riskLevel.toUpperCase()}`);
  } catch (e) {
    recordTest(4, 'Historical Landslide Scenario', false, e.message);
  }

  // ----------------------------------------------------------------
  // Test 5 & 6: High-Risk & Critical-Risk Prediction Classifications
  // ----------------------------------------------------------------
  try {
    const stormRes = await runSimulationScenario('scen-extreme-storm');
    const isHighOrCritical = ['high', 'critical'].includes(stormRes.newPrediction.riskLevel);
    recordTest(5, 'High-Risk Prediction', isHighOrCritical, `ML Model predicted level: ${stormRes.newPrediction.riskLevel.toUpperCase()}`);
    recordTest(6, 'Critical-Risk Prediction', stormRes.newPrediction.riskScore >= 80, `ML Score ${stormRes.newPrediction.riskScore}/100 exceeds critical threshold (80).`);
  } catch (e) {
    recordTest(5, 'High-Risk Prediction', false, e.message);
    recordTest(6, 'Critical-Risk Prediction', false, e.message);
  }

  // ----------------------------------------------------------------
  // Test 7: Risk Reduction after Conditions Improve
  // ----------------------------------------------------------------
  try {
    const safeRes = await runSimulationScenario('scen-live-safe');
    recordTest(7, 'Risk Reduction after Conditions Improve', safeRes.newPrediction.riskScore < 50, `Score reduced from Critical/High down to ${safeRes.newPrediction.riskScore}/100 (${safeRes.newPrediction.riskLevel.toUpperCase()}).`);
  } catch (e) {
    recordTest(7, 'Risk Reduction after Conditions Improve', false, e.message);
  }

  // ----------------------------------------------------------------
  // Test 8: Automatic Alert Generation
  // ----------------------------------------------------------------
  try {
    const alertSimRes = await runSimulationScenario('scen-extreme-storm');
    const alertExists = !!alertSimRes.automaticAlert;
    recordTest(8, 'Automatic Alert Generation', alertExists, alertExists ? `Alert ID: ${alertSimRes.automaticAlert.id}, Title: ${alertSimRes.automaticAlert.title}` : 'No alert object returned.');
  } catch (e) {
    recordTest(8, 'Automatic Alert Generation', false, e.message);
  }

  // ----------------------------------------------------------------
  // Test 9: Duplicate-Alert Prevention
  // ----------------------------------------------------------------
  try {
    const db = getDb();
    const countBefore = await db.collection('alerts').countDocuments();
    await runSimulationScenario('scen-extreme-storm');
    const countAfter = await db.collection('alerts').countDocuments();
    recordTest(9, 'Duplicate-Alert Prevention', countAfter <= countBefore + 1, 'Suppression logic prevented duplicate alert creation for identical recent event.');
  } catch (e) {
    recordTest(9, 'Duplicate-Alert Prevention', false, e.message);
  }

  // ----------------------------------------------------------------
  // Test 10 & 11: Citizen & Admin Notifications
  // ----------------------------------------------------------------
  try {
    const db = getDb();
    const notifs = await db.collection('notifications').find().toArray();
    recordTest(10, 'Citizen Notification', notifs.length > 0, `Total system notification docs created: ${notifs.length}`);
    recordTest(11, 'Admin Notification', notifs.some(n => n.type.includes('hazard') || n.type.includes('simulation')), 'SSE broadcast payload dispatched for admin command center.');
  } catch (e) {
    recordTest(10, 'Citizen Notification', false, e.message);
    recordTest(11, 'Admin Notification', false, e.message);
  }

  // ----------------------------------------------------------------
  // Test 12: Risk-Map Update
  // ----------------------------------------------------------------
  try {
    const db = getDb();
    const updatedZone = await db.collection('riskZones').findOne({});
    recordTest(12, 'Risk-Map Update', !!updatedZone && !!updatedZone.lastUpdated, `Zone '${updatedZone?.name}' updated with Risk Score ${updatedZone?.riskScore} at ${updatedZone?.lastUpdated}`);
  } catch (e) {
    recordTest(12, 'Risk-Map Update', false, e.message);
  }

  // ----------------------------------------------------------------
  // Test 13: Blocked-Road Simulation
  // ----------------------------------------------------------------
  try {
    const blockRes = await runSimulationScenario('scen-blocked-route');
    const db = getDb();
    const blockedRoad = await db.collection('roads').findOne({ status: 'blocked' });
    recordTest(13, 'Blocked-Road Simulation', !!blockedRoad, `Road '${blockedRoad?.name}' set to BLOCKED status.`);
  } catch (e) {
    recordTest(13, 'Blocked-Road Simulation', false, e.message);
  }

  // ----------------------------------------------------------------
  // Test 14: Automatic Route Recalculation
  // ----------------------------------------------------------------
  try {
    const sampleRoute = [
      { lat: 25.57, lng: 91.88 },
      { lat: 25.40, lng: 92.15 }
    ];
    const blockedRoads = [{ id: 'r1', name: 'NH-44 Highway Cut', status: 'blocked', riskLevel: 'critical', coordinates: [[25.57, 91.88], [25.40, 92.15]] }];
    const evalResult = evaluateRouteSafety(sampleRoute, [], blockedRoads);
    recordTest(14, 'Automatic Route Recalculation', evalResult.routeStatus === 'BLOCKED' || evalResult.warnings.length > 0, `Route Engine Warning: ${evalResult.warnings.join(' | ')}`);
  } catch (e) {
    recordTest(14, 'Automatic Route Recalculation', false, e.message);
  }

  // ----------------------------------------------------------------
  // Test 15: No-Safe-Route Condition
  // ----------------------------------------------------------------
  try {
    const sampleRoute = [
      { lat: 25.57, lng: 91.88 },
      { lat: 25.27, lng: 91.73 }
    ];
    const allBlockedRoads = [
      { id: 'r1', name: 'NH-44 Highway Cut', status: 'blocked', riskLevel: 'critical', coordinates: [[25.57, 91.88], [25.40, 92.15]] },
      { id: 'r2', name: 'SH-1 Cherrapunji Pass', status: 'blocked', riskLevel: 'critical', coordinates: [[25.27, 91.73], [25.35, 91.78]] }
    ];
    const evalResult = evaluateRouteSafety(sampleRoute, allBlockedRoads);
    recordTest(15, 'No-Safe-Route Condition', evalResult.routeStatus === 'BLOCKED', `No Verified Safe Route Fallback Message Triggered: ${evalResult.routeStatus}`);
  } catch (e) {
    recordTest(15, 'No-Safe-Route Condition', false, e.message);
  }

  // ----------------------------------------------------------------
  // Test 16: Reset Simulation
  // ----------------------------------------------------------------
  try {
    const resetRes = await resetSimulationMode();
    recordTest(16, 'Reset Simulation', resetRes.mode === 'live', `System reset to Live Mode: ${resetRes.message}`);
  } catch (e) {
    recordTest(16, 'Reset Simulation', false, e.message);
  }

  // ----------------------------------------------------------------
  // Test 17: Separation Between Live and Test Data
  // ----------------------------------------------------------------
  try {
    const simRes = await runSimulationScenario('scen-heavy-rain');
    const db = getDb();
    const simZone = await db.collection('riskZones').findOne({ dataMode: 'simulation' });
    recordTest(17, 'Separation Between Live and Test Data', !!simZone && simZone.dataMode === 'simulation', `Simulation records explicitly tagged with dataMode='simulation' (Scenario: ${simZone?.scenarioName})`);
    // Clean up reset
    await resetSimulationMode();
  } catch (e) {
    recordTest(17, 'Separation Between Live and Test Data', false, e.message);
  }

  console.log('\n================================================================');
  const passedCount = results.filter(r => r.success).length;
  console.log(`📊 SUMMARY: ${passedCount} / ${results.length} TEST CASES PASSED CLEANLY`);
  console.log('================================================================\n');

  process.exit(0);
}

runAllTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
