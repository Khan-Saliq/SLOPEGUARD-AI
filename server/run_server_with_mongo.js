const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}
process.env.MONGO_URL = 'mongodb+srv://khansaliq59_db_user:khansaliq59@cluster0.e5qpz18.mongodb.net/?retryWrites=true&w=majority';
require('./index.js');
