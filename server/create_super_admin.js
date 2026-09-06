#!/usr/bin/env node
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const uri = process.env.MONGO_URL || process.env.MONGODB_URI;
const dbName = process.env.MONGO_DB_NAME || process.env.MONGO_DB;
const email = (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.SUPER_ADMIN_PASSWORD || '';
const name = (process.env.SUPER_ADMIN_NAME || 'System Super Administrator').trim();

if (!uri || !email || !password) {
  console.error('Set MONGO_URL, SUPER_ADMIN_EMAIL, and SUPER_ADMIN_PASSWORD before running this command.');
  process.exit(1);
}
if (!/^\S+@\S+\.\S+$/.test(email)) {
  console.error('SUPER_ADMIN_EMAIL is invalid.');
  process.exit(1);
}
if (password.length < 12 || password.length > 128) {
  console.error('SUPER_ADMIN_PASSWORD must be between 12 and 128 characters.');
  process.exit(1);
}
if (name.length < 2 || name.length > 120) {
  console.error('SUPER_ADMIN_NAME must be between 2 and 120 characters.');
  process.exit(1);
}

(async () => {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const db = dbName ? client.db(dbName) : client.db();
    const users = db.collection('users');

    if (await users.findOne({ role: 'super_admin' })) {
      throw new Error('A super administrator already exists; refusing to create another.');
    }
    if (await users.findOne({ email })) {
      throw new Error('A user with SUPER_ADMIN_EMAIL already exists.');
    }

    const now = new Date().toISOString();
    const passwordHash = await bcrypt.hash(password, 12);
    await users.insertOne({
      id: `super-admin-${Date.now()}`,
      name,
      email,
      passwordHash,
      role: 'super_admin',
      accountStatus: 'active',
      emailVerified: true,
      twoFactorEnabled: false,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Created the initial super administrator for ${email}.`);
  } catch (error) {
    console.error(`Super administrator setup failed: ${error.message}`);
    process.exitCode = 2;
  } finally {
    await client.close();
  }
})();
