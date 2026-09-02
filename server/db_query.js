const { MongoClient } = require('mongodb');
(async ()=>{
  const uri = process.env.MONGO_URL || 'mongodb://localhost:27017';
  const client = new MongoClient(uri);
  try{
    await client.connect();
    const db = client.db();
    const reports = db.collection('reports');
    const users = db.collection('users');
    console.log('DB:', db.databaseName);
    console.log('reports count:', await reports.countDocuments());
    console.log('users count:', await users.countDocuments());
    const r = await reports.find().limit(5).toArray();
    console.log('reports sample:', r);
  }catch(e){ console.error('db error', e.message); process.exit(1) }finally{ await client.close(); }
})();
