const fs = require('fs');
const path = require('path');
const { getDb, connectMongo } = require('./mongo');

async function clearAllReports() {
  console.log('🧹 Clearing all previous submitted reports and assignments...');

  try {
    await connectMongo();
    const db = getDb();

    // 1. Delete all reports from MongoDB/DB
    const reportRes = await db.collection('reports').deleteMany({});
    console.log(`✅ Deleted ${reportRes.deletedCount || 0} reports from DB.`);

    // 2. Delete all assignments from MongoDB/DB
    const assignRes = await db.collection('assignments').deleteMany({});
    console.log(`✅ Deleted ${assignRes.deletedCount || 0} assignments from DB.`);

    // 3. Clear server/db.json reports array if present
    const dbJsonPath = path.join(__dirname, 'db.json');
    if (fs.existsSync(dbJsonPath)) {
      try {
        const raw = fs.readFileSync(dbJsonPath, 'utf8');
        const parsed = JSON.parse(raw);
        parsed.reports = [];
        parsed.assignments = [];
        fs.writeFileSync(dbJsonPath, JSON.stringify(parsed, null, 2));
        console.log('✅ Cleared reports and assignments in db.json.');
      } catch (e) {
        console.warn('db.json cleanup warning:', e.message);
      }
    }

    console.log('\n🎉 ALL PREVIOUS REPORTS DELETED SUCCESSFULLY FROM DATABASE!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error clearing reports:', err);
    process.exit(1);
  }
}

clearAllReports();
