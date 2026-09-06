const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}
if (!process.env.MONGO_URL && !process.env.MONGODB_URI) {
	throw new Error('Set MONGO_URL or MONGODB_URI before starting the server.');
}
require('./index.js');
