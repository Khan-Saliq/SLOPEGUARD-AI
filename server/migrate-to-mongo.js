const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Usage:
// MONGO_URL=... node migrate-to-mongo.js [--drop] [--seed] [--check]
// --drop  : drop the target database before creating collections
// --seed  : seed collections from server/db.json if present
// --check : perform a connectivity check (ping + simple read/write)

async function createCollectionsAndIndexes(db) {
  try {
    await db.createCollection('users');
  } catch (e) {}
  try {
    await db.createCollection('riskZones');
  } catch (e) {}
  try {
    await db.createCollection('alerts');
  } catch (e) {}
  try {
    await db.createCollection('reports');
  } catch (e) {}

  // indexes
  try {
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
  } catch (e) {}
  try {
    await db.collection('reports').createIndex({ createdAt: -1 });
  } catch (e) {}
}

async function seedFromFile(db) {
  const file = path.join(__dirname, 'db.json');
  if (!fs.existsSync(file)) {
    console.log('No server/db.json to seed from.');
    return;
  }

  const raw = fs.readFileSync(file, 'utf8');
  let data = {};
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse db.json:', e.message);
    return;
  }

  // Seed every top-level array in db.json as a collection
  for (const name of Object.keys(data)) {
    const arr = Array.isArray(data[name]) ? data[name] : [];
    if (!arr.length) continue;
    const coll = db.collection(name);
    const ops = arr.map(doc => {
      const copy = { ...doc };
      if (copy.id) {
        copy._id = copy.id;
        delete copy.id;
      }
      const filter = copy._id ? { _id: copy._id } : (copy.email ? { email: copy.email } : copy);
      return { replaceOne: { filter, replacement: copy, upsert: true } };
    });
    try {
      const res = await coll.bulkWrite(ops, { ordered: false });
      console.log(`Seeded ${name}: upserted=${res.upsertedCount || 0} modified=${res.modifiedCount || 0}`);
    } catch (e) {
      console.error(`Failed to seed ${name}:`, e.message);
    }
  }
}

async function connectivityCheck(db) {
  try {
    const admin = db.admin ? db.admin() : db.command ? db : null;
    if (admin && admin.ping) {
      // modern driver: db.command({ ping: 1 })
      try {
        await db.command({ ping: 1 });
        console.log('Ping successful.');
      } catch (e) {
        console.warn('Ping failed:', e.message);
      }
    }

    // Try a small read/write
    const coll = db.collection('healthchecks');
    const doc = { ts: new Date().toISOString(), note: 'migration-check' };
    const r = await coll.insertOne(doc);
    const found = await coll.findOne({ _id: r.insertedId });
    if (found) {
      console.log('Read/write check passed.');
      await coll.deleteOne({ _id: r.insertedId });
    } else {
      console.warn('Read/write check failed.');
    }
  } catch (e) {
    console.error('Connectivity check failed:', e.message);
  }
}

async function run() {
  const uri = process.env.MONGO_URL || process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGO_URL or MONGODB_URI environment variable is required.');
    process.exit(1);
  }

  const doDrop = process.argv.includes('--drop') || process.env.MIGRATE_DROP === 'true';
  const doSeed = process.argv.includes('--seed') || process.env.MIGRATE_SEED === 'true';
  const doCheck = process.argv.includes('--check') || process.env.MIGRATE_CHECK === 'true';
  const dbName = process.env.MONGO_DB_NAME || undefined; // let MongoClient pick DB from URI if provided

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = dbName ? client.db(dbName) : client.db();
    console.log('Connected to MongoDB', db.databaseName || '(unknown)');

    if (doDrop) {
      console.log(`Dropping database '${db.databaseName}' as requested...`);
      await db.dropDatabase();
      console.log('Database dropped.');
    }

    await createCollectionsAndIndexes(db);
    console.log('Collections and indexes created/ensured.');

    if (doSeed) {
      await seedFromFile(db);
    }

    if (doCheck) {
      await connectivityCheck(db);
    }

    console.log('Migration script completed.');
  } catch (e) {
    console.error('Migration failed:', e.message);
    process.exitCode = 2;
  } finally {
    await client.close();
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
