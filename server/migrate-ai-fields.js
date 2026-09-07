/**
 * Database Migration Script
 * Updates report documents in MongoDB or local persistence (db.json) with standardized AI Inspection fields.
 */

const { connectMongo, getDb } = require('./mongo');

async function runMigration() {
  console.log('🚀 Starting AI Fields Database Migration...');
  const MONGO_URL = process.env.MONGO_URL || process.env.MONGODB_URI;

  try {
    await connectMongo(MONGO_URL);
    const db = getDb();
    const reportsCollection = db.collection('reports');

    const reports = await reportsCollection.find({}).toArray();
    console.log(`📋 Found ${reports.length} report records to inspect.`);

    let updatedCount = 0;

    for (const r of reports) {
      const updateFields = {
        ai_analysis_status: r.ai_analysis_status || (r.status === 'submitted' ? 'PENDING' : 'COMPLETED'),
        ai_model_name: r.ai_model_name || process.env.HUGGINGFACE_IMAGE_MODEL || 'google/vit-base-patch16-224',
        ai_model_version: r.ai_model_version || 'v1.0.0',
        detected_labels: r.detected_labels || r.detectedFeatures || [],
        label_confidence: r.label_confidence || r.aiConfidence || 0,
        predicted_hazard_type: r.predicted_hazard_type || (r.category ? `POSSIBLE_${String(r.category).toUpperCase()}` : 'UNKNOWN'),
        hazard_confidence: r.hazard_confidence || r.aiConfidence || 0,
        image_relevance: r.image_relevance || 'POSSIBLY_RELEVANT',
        requires_human_review: true,
        requiresHumanVerification: true,
        ai_processed_at: r.ai_processed_at || r.timestamp || new Date().toISOString(),
        ai_error_message: r.ai_error_message || null,
        summaryMessage: r.summaryMessage || 'Possible hazard environment detected. Awaiting official verification.',
      };

      await reportsCollection.updateOne({ id: r.id || r._id }, { $set: updateFields });
      updatedCount++;
    }

    console.log(`✅ Successfully updated ${updatedCount} report documents with standardized AI fields.`);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    process.exit(0);
  }
}

runMigration();
