const { analyzeImageWithHuggingFace } = require('./server/services/huggingfaceImageService.js');

async function testInspection() {
  console.log('🧪 Testing Hugging Face AI Vision Inspection Service...\n');

  // Test 1: Test with dummy landslide base64 image
  const dummyLandslideBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  console.log('--- Test Scenario 1: Landslide Hazard Photo Inspection ---');
  try {
    const result1 = await analyzeImageWithHuggingFace(dummyLandslideBase64, 'landslide');
    console.log('✅ Result 1 Payload:');
    console.log({
      analysisStatus: result1.analysisStatus,
      decision: result1.decision,
      imageRelevance: result1.imageRelevance,
      possibleHazardType: result1.possibleHazardType,
      hazardConfidence: result1.hazardConfidence,
      modelName: result1.modelName,
      summaryMessage: result1.summaryMessage
    });
  } catch (err) {
    console.error('❌ Test Scenario 1 Error:', err.message);
  }

  console.log('\n--- Test Scenario 2: Water Seepage Hazard Inspection ---');
  try {
    const result2 = await analyzeImageWithHuggingFace(dummyLandslideBase64, 'water_seepage');
    console.log('✅ Result 2 Payload:');
    console.log({
      analysisStatus: result2.analysisStatus,
      decision: result2.decision,
      imageRelevance: result2.imageRelevance,
      possibleHazardType: result2.possibleHazardType,
      hazardConfidence: result2.hazardConfidence,
      modelName: result2.modelName,
      summaryMessage: result2.summaryMessage
    });
  } catch (err) {
    console.error('❌ Test Scenario 2 Error:', err.message);
  }

  console.log('\n✨ Hugging Face AI Inspection Test Suite Completed.');
}

testInspection();
