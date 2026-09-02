#!/usr/bin/env node
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const uri = process.env.MONGO_URL || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/landslide';
const dbName = process.env.MONGO_DB_NAME || process.env.MONGO_DB || 'landslide';

const [,, email, newPass] = process.argv;

if (!email || !newPass) {
  console.error('Usage: node reset_admin_password.js <email> <newPassword>');
  process.exit(1);
}

(async () => {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(dbName);
    const users = db.collection('users');

    const hash = await bcrypt.hash(newPass, 10);

    const res = await users.findOneAndUpdate(
      { email },
      { $set: { email, passwordHash: hash, role: 'authority', updatedAt: new Date() } },
      { upsert: true, returnDocument: 'after' }
    );

    console.log('Success. User updated/created:', res.value ? res.value.email : email);
    process.exit(0);
  } catch (err) {
    console.error('Error resetting admin password:', err);
    process.exit(2);
  } finally {
    await client.close();
  }
})();
