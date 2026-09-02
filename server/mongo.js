const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

let client = null;
let db = null;
let useLocalFallback = false;
const dbJsonPath = path.join(__dirname, 'db.json');

function loadLocalDb() {
  try {
    if (fs.existsSync(dbJsonPath)) {
      const text = fs.readFileSync(dbJsonPath, 'utf8');
      return JSON.parse(text);
    }
  } catch (e) {
    console.error('Failed reading db.json:', e.message);
  }
  return { users: [], riskZones: [], alerts: [], reports: [], assignments: [], notifications: [] };
}

function saveLocalDb(data) {
  try {
    fs.writeFileSync(dbJsonPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed writing db.json:', e.message);
  }
}

let localData = loadLocalDb();

function matchFilter(item, filter = {}) {
  if (!filter || Object.keys(filter).length === 0) return true;
  for (const [k, v] of Object.entries(filter)) {
    if (k === '_id' || k === 'id') {
      if (item._id != v && item.id != v) return false;
    } else if (item[k] !== v) {
      return false;
    }
  }
  return true;
}

function createLocalCollection(name) {
  if (!localData[name]) localData[name] = [];
  return {
    async find(filter = {}) {
      let items = localData[name].filter(item => matchFilter(item, filter));
      return {
        sort(sortObj = {}) {
          const keys = Object.keys(sortObj);
          if (keys.length > 0) {
            const key = keys[0];
            const dir = sortObj[key];
            items.sort((a, b) => (a[key] > b[key] ? dir : -dir));
          }
          return { toArray: async () => items };
        },
        toArray: async () => items,
      };
    },
    async findOne(filter = {}) {
      return localData[name].find(item => matchFilter(item, filter)) || null;
    },
    async insertOne(doc) {
      const _id = doc._id || doc.id || String(Date.now());
      const newDoc = { ...doc, _id, id: doc.id || _id };
      localData[name].push(newDoc);
      saveLocalDb(localData);
      return { insertedId: _id, acknowledged: true };
    },
    async insertMany(docs) {
      docs.forEach(doc => {
        const _id = doc._id || doc.id || String(Date.now());
        localData[name].push({ ...doc, _id, id: doc.id || _id });
      });
      saveLocalDb(localData);
      return { acknowledged: true };
    },
    async countDocuments(filter = {}) {
      return localData[name].filter(item => matchFilter(item, filter)).length;
    },
    async createIndex() {
      return true;
    },
    async updateOne(filter, update) {
      const idx = localData[name].findIndex(item => matchFilter(item, filter));
      if (idx !== -1 && update && update.$set) {
        localData[name][idx] = { ...localData[name][idx], ...update.$set };
        saveLocalDb(localData);
      }
      return { modifiedCount: idx !== -1 ? 1 : 0 };
    },
    async deleteMany(filter) {
      localData[name] = localData[name].filter(item => !matchFilter(item, filter));
      saveLocalDb(localData);
      return { acknowledged: true };
    },
    async findOneAndUpdate(filter, update, options = {}) {
      const idx = localData[name].findIndex(item => matchFilter(item, filter));
      if (idx === -1) return { value: null };
      if (update && update.$set) {
        localData[name][idx] = { ...localData[name][idx], ...update.$set };
        saveLocalDb(localData);
      }
      return { value: localData[name][idx] };
    },
  };
}

const localDbMock = {
  collection: (name) => createLocalCollection(name),
};

async function connectMongo(uri) {
  try {
    if (!uri) throw new Error('MONGO_URL not provided');
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000, connectTimeoutMS: 3000 });
    await client.connect();
    db = client.db();
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    useLocalFallback = false;
    console.log('✅ Connected to MongoDB Atlas');
    return db;
  } catch (err) {
    console.warn(`⚠️  MongoDB connection unavailable (${err.message}). Defaulting to local JSON persistence (db.json).`);
    useLocalFallback = true;
    db = localDbMock;
    return db;
  }
}

function getDb() {
  if (!db) {
    useLocalFallback = true;
    db = localDbMock;
  }
  return db;
}

async function seedAdminIfEmpty() {
  const users = getDb().collection('users');
  const count = await users.countDocuments();
  if (count === 0) {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('adminpass', 8);
    await users.insertOne({ id: 'u-admin', name: 'Administrator', email: 'admin@example.com', passwordHash: hash, role: 'authority', createdAt: new Date() });
    console.log('Seeded authority user: admin@example.com / adminpass');
  }
}

module.exports = { connectMongo, getDb, seedAdminIfEmpty };
