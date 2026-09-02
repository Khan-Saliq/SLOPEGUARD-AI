process.env.MONGO_URL = 'mongodb://khansaliq59_db_user:khansaliq59@ac-mozolwz-shard-00-00.e5qpz18.mongodb.net:27017,ac-mozolwz-shard-00-01.e5qpz18.mongodb.net:27017,ac-mozolwz-shard-00-02.e5qpz18.mongodb.net:27017/?ssl=true&replicaSet=atlas-d3kz8g-shard-0&authSource=admin&appName=Cluster0&compressors=zlib';
require('./migrate-to-mongo.js');
