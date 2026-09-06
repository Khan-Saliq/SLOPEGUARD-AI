if (!process.env.MONGO_URL && !process.env.MONGODB_URI) throw new Error('Set MONGO_URL or MONGODB_URI before running this utility.');
require('./db_query.js');
