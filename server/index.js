const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { connectMongo, getDb } = require('./mongo');
const { fetchEnvironmentalData, fetchEnvironmentalDataBatch } = require('./dataFetcher');
const { checkMLHealth, predictRisk, predictBatch } = require('./mlClient');
const { analyzeImageWithHuggingFace } = require('./services/huggingfaceImageService');
const { calculateDirections } = require('./services/directionsService');
const { evaluateRouteSafety, rankAlternativeRoutes } = require('./services/routeSafetyService');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

process.on('uncaughtException', (err) => {
  console.error('uncaughtException', err && (err.stack || err.message || err));
});
process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection', reason && (reason.stack || reason.message || reason));
});
const logFile = path.join(__dirname, 'server_runtime.log');
function appendLog(...parts) { try { fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${parts.map(p=>typeof p==='string'?p:JSON.stringify(p)).join(' ')}\n`); } catch (e) { console.error('log write failed', e); } }
appendLog('process-start', { pid: process.pid, argv: process.argv });

const SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : require('crypto').randomBytes(32).toString('hex'));
if (!SECRET) throw new Error('JWT_SECRET is required in production');

async function seedDefaultRiskZones() {
  const zones = getDb().collection('riskZones');
  const count = await zones.countDocuments();
  if (count === 0) {
    const defaultZones = [
      { id: nanoid(), name: 'Cherrapunji Sohra Slope Cut', location: { lat: 25.27, lng: 91.73, district: 'East Khasi Hills', state: 'Meghalaya' }, historicalRisk: 95, satelliteIndicator: 85, population: 5600, infrastructureCount: 14 },
      { id: nanoid(), name: 'Upper Shillong Highway Pass', location: { lat: 25.54, lng: 91.87, district: 'East Khasi Hills', state: 'Meghalaya' }, historicalRisk: 88, satelliteIndicator: 78, population: 8900, infrastructureCount: 22 },
      { id: nanoid(), name: 'Kamrup Bypass Hill Corridor', location: { lat: 26.14, lng: 91.73, district: 'Kamrup Metropolitan', state: 'Assam' }, historicalRisk: 75, satelliteIndicator: 70, population: 14200, infrastructureCount: 35 },
      { id: nanoid(), name: 'Upper Gangtok Highway Cut', location: { lat: 27.33, lng: 88.61, district: 'Gangtok', state: 'Sikkim' }, historicalRisk: 92, satelliteIndicator: 80, population: 4300, infrastructureCount: 18 },
      { id: nanoid(), name: 'Champhai Mountain Border Cut', location: { lat: 23.47, lng: 93.32, district: 'Champhai', state: 'Mizoram' }, historicalRisk: 70, satelliteIndicator: 65, population: 2800, infrastructureCount: 8 },
      { id: nanoid(), name: 'Kohima Bypass Cliff Corridor', location: { lat: 25.67, lng: 94.10, district: 'Kohima', state: 'Nagaland' }, historicalRisk: 80, satelliteIndicator: 68, population: 3600, infrastructureCount: 12 },
      { id: nanoid(), name: 'Itanagar Papum Pare Slope', location: { lat: 27.10, lng: 93.62, district: 'Papum Pare', state: 'Arunachal Pradesh' }, historicalRisk: 55, satelliteIndicator: 50, population: 5200, infrastructureCount: 15 },
      { id: nanoid(), name: 'Imphal West Hill Edge', location: { lat: 24.81, lng: 93.93, district: 'Imphal West', state: 'Manipur' }, historicalRisk: 85, satelliteIndicator: 75, population: 6700, infrastructureCount: 19 }
    ];
    await zones.insertMany(defaultZones);
    console.log(`Seeded ${defaultZones.length} default risk zones`);
  }
}

async function seedDefaultEvacuationData() {
  const db = getDb();
  
  // 1. Seed Roads
  const roadsCol = db.collection('roads');
  if (await roadsCol.countDocuments() === 0) {
    const defaultRoads = [
      { id: 'r1', name: 'NH-44 Shillong-Silchar Highway', status: 'blocked', district: 'East Khasi Hills', riskLevel: 'critical', coordinates: [[25.57, 91.88], [25.40, 92.15]], lastReport: new Date(Date.now() - 40 * 60000).toISOString() },
      { id: 'r2', name: 'SH-1 Cherrapunji Access Road', status: 'blocked', district: 'East Khasi Hills', riskLevel: 'high', coordinates: [[25.27, 91.73], [25.35, 91.78]], lastReport: new Date(Date.now() - 90 * 60000).toISOString() },
      { id: 'r3', name: 'NH-37 Guwahati-Jorhat Highway', status: 'operational', district: 'Kamrup Metropolitan', riskLevel: 'moderate', coordinates: [[26.18, 91.74], [26.45, 92.80]], lastReport: new Date(Date.now() - 15 * 60000).toISOString() },
      { id: 'r4', name: 'NH-10 Gangtok-Siliguri Pass', status: 'vulnerable', district: 'Gangtok', riskLevel: 'high', coordinates: [[27.33, 88.61], [27.00, 88.45]], lastReport: new Date(Date.now() - 120 * 60000).toISOString() },
      { id: 'r5', name: 'NH-2 Kohima-Dimapur Bypass', status: 'operational', district: 'Kohima', riskLevel: 'moderate', coordinates: [[25.67, 94.10], [25.90, 93.72]], lastReport: new Date(Date.now() - 60 * 60000).toISOString() },
      { id: 'r6', name: 'NH-415 Itanagar Papum Pare Pass', status: 'operational', district: 'Papum Pare', riskLevel: 'low', coordinates: [[27.10, 93.62], [27.05, 93.45]], lastReport: new Date(Date.now() - 180 * 60000).toISOString() },
      { id: 'r7', name: 'NH-102 Imphal-Moreh Highway', status: 'damaged', district: 'Imphal West', riskLevel: 'high', coordinates: [[24.81, 93.93], [24.25, 94.30]], lastReport: new Date(Date.now() - 45 * 60000).toISOString() },
      { id: 'r8', name: 'NH-54 Aizawl-Lunglei Highway', status: 'operational', district: 'Aizawl', riskLevel: 'moderate', coordinates: [[23.73, 92.71], [22.88, 92.73]], lastReport: new Date(Date.now() - 200 * 60000).toISOString() }
    ];
    await roadsCol.insertMany(defaultRoads);
    console.log(`Seeded ${defaultRoads.length} default roads`);
  }

  // 2. Seed Shelters & Evacuation Centers
  const sheltersCol = db.collection('shelters');
  if (await sheltersCol.countDocuments() === 0) {
    const defaultShelters = [
      { id: 's1', name: 'Shillong Municipal Evacuation Center', type: 'evacuation_center', district: 'East Khasi Hills', state: 'Meghalaya', capacity: 1200, currentOccupancy: 340, status: 'open', location: { lat: 25.578, lng: 91.893, district: 'East Khasi Hills', state: 'Meghalaya' }, contactNumber: '+91-364-2224000', facilities: ['First Aid', 'Clean Water', 'Emergency Ration', 'Generator'] },
      { id: 's2', name: 'Sohra Relief Assembly Point', type: 'shelter', district: 'East Khasi Hills', state: 'Meghalaya', capacity: 650, currentOccupancy: 180, status: 'open', location: { lat: 25.295, lng: 91.722, district: 'East Khasi Hills', state: 'Meghalaya' }, contactNumber: '+91-364-2538000', facilities: ['Bedding', 'Medical Station', 'Satellite Phone'] },
      { id: 's3', name: 'Guwahati Central Indoor Relief Hub', type: 'evacuation_center', district: 'Kamrup Metropolitan', state: 'Assam', capacity: 2500, currentOccupancy: 820, status: 'open', location: { lat: 26.144, lng: 91.736, district: 'Kamrup Metropolitan', state: 'Assam' }, contactNumber: '+91-361-2237000', facilities: ['Food Kitchen', 'ICU Ambulances', 'Children Ward'] },
      { id: 's4', name: 'Gangtok Community Safe Haven', type: 'shelter', district: 'Gangtok', state: 'Sikkim', capacity: 800, currentOccupancy: 210, status: 'open', location: { lat: 27.329, lng: 88.613, district: 'Gangtok', state: 'Sikkim' }, contactNumber: '+91-3592-202000', facilities: ['Blankets', 'Hot Meals', 'Rescue Gear'] },
      { id: 's5', name: 'Kohima High Ground Safe Point', type: 'assembly_point', district: 'Kohima', state: 'Nagaland', capacity: 500, currentOccupancy: 90, status: 'open', location: { lat: 25.674, lng: 94.110, district: 'Kohima', state: 'Nagaland' }, contactNumber: '+91-370-2220000', facilities: ['Water Tank', 'Radio Dispatch'] }
    ];
    await sheltersCol.insertMany(defaultShelters);
    console.log(`Seeded ${defaultShelters.length} default emergency shelters`);
  }

  // 3. Seed Hospitals
  const hospitalsCol = db.collection('hospitals');
  if (await hospitalsCol.countDocuments() === 0) {
    const defaultHospitals = [
      { id: 'h1', name: 'NEIGRIHMS Multi-Speciality Hospital', type: 'hospital', district: 'East Khasi Hills', state: 'Meghalaya', bedCapacity: 550, availableICUBeds: 24, emergencyServices: true, status: 'operational', location: { lat: 25.589, lng: 91.932, district: 'East Khasi Hills', state: 'Meghalaya' }, contactNumber: '+91-364-2538025' },
      { id: 'h2', name: 'Shillong Civil Hospital', type: 'hospital', district: 'East Khasi Hills', state: 'Meghalaya', bedCapacity: 320, availableICUBeds: 8, emergencyServices: true, status: 'operational', location: { lat: 25.568, lng: 91.884, district: 'East Khasi Hills', state: 'Meghalaya' }, contactNumber: '+91-364-2226381' },
      { id: 'h3', name: 'Guwahati Medical College & Hospital (GMCH)', type: 'hospital', district: 'Kamrup Metropolitan', state: 'Assam', bedCapacity: 1400, availableICUBeds: 62, emergencyServices: true, status: 'operational', location: { lat: 26.152, lng: 91.778, district: 'Kamrup Metropolitan', state: 'Assam' }, contactNumber: '+91-361-2529457' },
      { id: 'h4', name: 'Gangtok STNM Multi-Speciality Hospital', type: 'hospital', district: 'Gangtok', state: 'Sikkim', bedCapacity: 450, availableICUBeds: 18, emergencyServices: true, status: 'operational', location: { lat: 27.318, lng: 88.601, district: 'Gangtok', state: 'Sikkim' }, contactNumber: '+91-3592-202944' },
      { id: 'h5', name: 'Naga Hospital Authority Kohima', type: 'hospital', district: 'Kohima', state: 'Nagaland', bedCapacity: 300, availableICUBeds: 12, emergencyServices: true, status: 'operational', location: { lat: 25.669, lng: 94.104, district: 'Kohima', state: 'Nagaland' }, contactNumber: '+91-370-2222916' }
    ];
    await hospitalsCol.insertMany(defaultHospitals);
    console.log(`Seeded ${defaultHospitals.length} default hospitals`);
  }

  // 4. Seed Evacuation Routes
  const evacRoutesCol = db.collection('evacuationRoutes');
  if (await evacRoutesCol.countDocuments() === 0) {
    const defaultEvacRoutes = [
      {
        id: 'er1',
        title: 'Shillong to NEIGRIHMS Safe Relief Route',
        originName: 'Shillong City Center',
        destinationName: 'NEIGRIHMS Hospital',
        district: 'East Khasi Hills',
        coordinates: [[91.884, 25.568], [91.900, 25.575], [91.932, 25.589]],
        distanceKm: 11.4,
        estHours: 0.35,
        status: 'published',
        createdBy: 'Admin Authority',
        createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
        safetyRating: 'RECOMMENDED',
        warnings: ['✓ Verified clear by Field Patrol', 'ℹ️ Use Upper Shillong bypass']
      }
    ];
    await evacRoutesCol.insertMany(defaultEvacRoutes);
    console.log(`Seeded ${defaultEvacRoutes.length} default official evacuation routes`);
  }
}

async function init() {
  const MONGO_URL = process.env.MONGO_URL || process.env.MONGODB_URI;
  try {
    await connectMongo(MONGO_URL);
    await seedDefaultRiskZones();
    await seedDefaultEvacuationData();
  } catch (e) {
    console.warn('Backend initialized with fallback:', e.message);
  }
  // ensure uploads dir exists
  const uploadsDir = path.join(__dirname, 'uploads');
  try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch (e) {}
}

// Helper abstraction: use Mongo if connected, otherwise lowdb
async function findUserByEmail(email) {
  const users = getDb().collection('users');
  return users.findOne({ email });
}

async function findUserById(id) {
  const users = getDb().collection('users');
  return (await users.findOne({ _id: id })) || (await users.findOne({ id }));
}

async function createUser(user) {
  const users = getDb().collection('users');
  const r = await users.insertOne(user);
  return { ...user, _id: r.insertedId };
}

async function getRiskZonesData() {
  return (await getDb().collection('riskZones').find().toArray()).map(normalizeRiskZone);
}

function normalizeRiskZone(zone) {
  const environmental = zone.environmental_data || zone.environmentalData || {};
  return {
    ...zone,
    riskScore: Number.isFinite(Number(zone.riskScore)) ? Number(zone.riskScore) : null,
    riskLevel: zone.riskLevel || null,
    confidence: Number.isFinite(Number(zone.confidence)) ? Number(zone.confidence) : null,
    rainfall: Number.isFinite(Number(zone.rainfall)) ? Number(zone.rainfall) : (Number.isFinite(Number(zone.rainfall_24h)) ? Number(zone.rainfall_24h) : (Number.isFinite(Number(environmental.rainfall_24h)) ? Number(environmental.rainfall_24h) : null)),
    rainfall_24h: Number.isFinite(Number(zone.rainfall_24h)) ? Number(zone.rainfall_24h) : (Number.isFinite(Number(environmental.rainfall_24h)) ? Number(environmental.rainfall_24h) : null),
    rainfall_72h: Number.isFinite(Number(zone.rainfall_72h)) ? Number(zone.rainfall_72h) : (Number.isFinite(Number(environmental.rainfall_72h)) ? Number(environmental.rainfall_72h) : null),
    rainfall_intensity: Number.isFinite(Number(zone.rainfall_intensity)) ? Number(zone.rainfall_intensity) : (Number.isFinite(Number(environmental.rainfall_intensity)) ? Number(environmental.rainfall_intensity) : null),
    soilMoisture: Number.isFinite(Number(zone.soilMoisture)) ? Number(zone.soilMoisture) : (Number.isFinite(Number(zone.soil_moisture)) ? Number(zone.soil_moisture) : (Number.isFinite(Number(environmental.soil_moisture)) ? Number(environmental.soil_moisture) : null)),
    soil_moisture: Number.isFinite(Number(zone.soil_moisture)) ? Number(zone.soil_moisture) : (Number.isFinite(Number(environmental.soil_moisture)) ? Number(environmental.soil_moisture) : null),
    slope: Number.isFinite(Number(zone.slope)) ? Number(zone.slope) : (Number.isFinite(Number(environmental.slope)) ? Number(environmental.slope) : null),
    elevation: Number.isFinite(Number(zone.elevation)) ? Number(zone.elevation) : (Number.isFinite(Number(environmental.elevation)) ? Number(environmental.elevation) : null),
    dataStatus: zone.dataStatus || (Object.keys(environmental).length > 0 ? 'available' : 'awaiting_data_source'),
  };
}

async function getAlertsData() {
  return (await getDb().collection('alerts').find().toArray()) || [];
}

async function getReportsData(user) {
  const role = ['admin', 'super_admin'].includes(user.role) ? 'authority' : user.role;
  const q = role === 'authority' ? {} : { userId: user.id };
  return (await getDb().collection('reports').find(q).toArray()) || [];
}

async function insertReportDoc(report) {
  const r = await getDb().collection('reports').insertOne(report);
  return { ...report, _id: r.insertedId };
}

function generateToken(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name, email: user.email }, SECRET, { expiresIn: '7d' });
}

async function authMiddleware(req, res, next) {
  let auth = req.headers.authorization;
  // allow token via query param for EventSource fallback
  if (!auth && req.query && req.query.token) auth = `Bearer ${req.query.token}`;
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'Unauthorized' });
  const token = parts[1];
  try {
    const decoded = jwt.verify(token, SECRET);
    const currentUser = await findUserById(decoded.id);
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });
    if (currentUser.accountStatus && currentUser.accountStatus !== 'active') return res.status(403).json({ error: 'Account is not active' });
    req.user = {
      ...decoded,
      id: currentUser.id || currentUser._id,
      role: currentUser.role,
      name: currentUser.name,
      email: currentUser.email,
    };
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

async function optionalAuthMiddleware(req, res, next) {
  let auth = req.headers.authorization;
  if (!auth && req.query && req.query.token) auth = `Bearer ${req.query.token}`;
  if (!auth) {
    req.user = { id: 'anonymous-citizen', role: 'citizen', name: 'Anonymous Citizen' };
    return next();
  }
  const parts = auth.split(' ');
  if (parts.length !== 2) {
    req.user = { id: 'anonymous-citizen', role: 'citizen', name: 'Anonymous Citizen' };
    return next();
  }
  try {
    const decoded = jwt.verify(parts[1], SECRET);
    const currentUser = await findUserById(decoded.id);
    if (currentUser) {
      req.user = {
        ...decoded,
        id: currentUser.id || currentUser._id,
        role: currentUser.role,
        name: currentUser.name,
        email: currentUser.email,
      };
    } else {
      req.user = { id: 'anonymous-citizen', role: 'citizen', name: 'Anonymous Citizen' };
    }
  } catch (e) {
    req.user = { id: 'anonymous-citizen', role: 'citizen', name: 'Anonymous Citizen' };
  }
  next();
}

// Simple SSE (Server-Sent Events) subscription map: userId -> array of res
const sseClients = new Map();
function sendSse(userId, event, data) {
  const list = sseClients.get(userId) || [];
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  list.forEach((res) => {
    try { res.write(payload); } catch (e) { /* ignore */ }
  });
  appendLog('sse-send', { userId, event, count: list.length, data });
}

app.get('/api/stream', authMiddleware, (req, res) => {
  // SSE headers
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders && res.flushHeaders();
  const userId = req.user.id;
  const arr = sseClients.get(userId) || [];
  arr.push(res);
  sseClients.set(userId, arr);
  // send initial ping
  res.write(`event: ping\ndata: ${JSON.stringify({ ok: true })}\n\n`);
  appendLog('sse-connect', { userId, clients: (sseClients.get(userId)||[]).length });
  // remove on close
  req.on('close', () => {
    const cur = sseClients.get(userId) || [];
    sseClients.set(userId, cur.filter(r => r !== res));
    appendLog('sse-disconnect', { userId, clients: (sseClients.get(userId)||[]).length });
  });
});

// Serve external logo from workspace root (logo.png expected at workspace root)
app.get('/external-logo.png', (req, res) => {
  try {
    const logoPath = path.join(__dirname, '..', '..', 'logo.png');
    if (fs.existsSync(logoPath)) return res.sendFile(logoPath);
    return res.status(404).send('Not found');
  } catch (e) {
    return res.status(500).send('Error');
  }
});

app.get('/health', (req, res) => res.json({ ok: true, pid: process.pid }));

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const r = req.user.role || req.user.role?.toString();
    if (roles.includes(r) || (r === 'super_admin' && roles.includes('authority'))) return next();
    return res.status(403).json({ error: 'Forbidden' });
  };
}

const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;

function loginKey(req, email) {
  return `${req.ip}:${String(email).trim().toLowerCase()}`;
}

function loginBlocked(key) {
  const entry = loginAttempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.firstAttempt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return false;
  }
  return entry.failures >= MAX_LOGIN_ATTEMPTS;
}

function recordLoginFailure(key) {
  const entry = loginAttempts.get(key);
  if (!entry || Date.now() - entry.firstAttempt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { firstAttempt: Date.now(), failures: 1 });
  } else {
    entry.failures += 1;
  }
}

app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'Missing fields' });
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 120) return res.status(400).json({ error: 'Name must be between 2 and 120 characters' });
  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Invalid email address' });
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) return res.status(400).json({ error: 'Password must be between 12 and 128 characters' });
  const exists = await findUserByEmail(email);
  if (exists) return res.status(400).json({ error: 'User exists' });
  const hash = await bcrypt.hash(password, 12);
  const user = { id: nanoid(), name: name.trim(), email: email.trim().toLowerCase(), passwordHash: hash, role: 'citizen', accountStatus: 'active', emailVerified: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const created = await createUser(user);
  const token = generateToken(user);
  res.json({ token, user: { id: created.id || created._id || user.id, name: user.name, email: user.email, role: user.role } });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const key = loginKey(req, email);
  if (loginBlocked(key)) return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
  const user = await findUserByEmail(email);
  if (!user) {
    recordLoginFailure(key);
    return res.status(400).json({ error: 'Invalid credentials' });
  }
  if (user.accountStatus && user.accountStatus !== 'active') return res.status(403).json({ error: 'Account is not active' });
  const ok = await bcrypt.compare(password, user.passwordHash || '');
  if (!ok) {
    recordLoginFailure(key);
    return res.status(400).json({ error: 'Invalid credentials' });
  }
  loginAttempts.delete(key);
  const normalizedRole = user.role === 'admin' ? 'authority' : user.role;
  const token = generateToken({ id: user.id || user._id, role: normalizedRole, name: user.name, email: user.email });
  res.json({ token, user: { id: user.id || user._id, name: user.name, email: user.email, role: normalizedRole } });
});

app.get('/api/me', authMiddleware, async (req, res) => {
  const user = await findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  const normalizedRole = user.role === 'admin' ? 'authority' : user.role;
  res.json({ id: user.id || user._id, name: user.name, email: user.email, role: normalizedRole });
});

app.get('/api/risk-zones', authMiddleware, async (req, res) => {
  const data = await getRiskZonesData();
  res.json(data || []);
});

app.get('/api/risk-zones/:id/environment', authMiddleware, async (req, res) => {
  const zone = await getDb().collection('riskZones').findOne({ id: req.params.id });
  if (!zone) return res.status(404).json({ error: 'Risk zone not found' });
  const normalized = normalizeRiskZone(zone);
  res.json({
    zone: normalized,
    environmental_data: zone.environmental_data || zone.environmentalData || null,
    prediction: zone.prediction || null,
    last_updated: zone.lastUpdated || null,
  });
});

app.get('/api/alerts', authMiddleware, async (req, res) => {
  const data = await getAlertsData();
  res.json(data || []);
});

app.get('/api/reports', authMiddleware, async (req, res) => {
  const data = await getReportsData(req.user);
  res.json(data || []);
});

// Assignments: authority review workflow
app.get('/api/assignments', authMiddleware, requireRole('authority','field_official'), async (req, res) => {
  const q = {};
  // authorities see all, field_officials see assigned to them
  if (req.user.role === 'field_official') q.assigneeId = req.user.id;
  const items = await getDb().collection('assignments').find(q).toArray();
  res.json(items || []);
});

app.post('/api/assignments', authMiddleware, requireRole('authority','field_official'), async (req, res) => {
  const { reportId, assigneeId } = req.body || {};
  if (!reportId) return res.status(400).json({ error: 'Missing reportId' });
  const assignment = { id: nanoid(), reportId, creatorId: req.user.id, assigneeId: assigneeId || null, status: assigneeId ? 'assigned' : 'unassigned', createdAt: new Date().toISOString() };
  await getDb().collection('assignments').insertOne(assignment);
  // create notification for assignee
  if (assigneeId) {
    const note = { id: nanoid(), userId: assigneeId, type: 'assignment', message: `You were assigned report ${reportId}`, read: false, createdAt: new Date().toISOString(), meta: { reportId } };
    await getDb().collection('notifications').insertOne(note);
    sendSse(assigneeId, 'notification', note);
  }
  // also notify the original report submitter (citizen) that their report was assigned
  try {
    const report = await getDb().collection('reports').findOne({ id: reportId });
    if (report && report.userId) {
      const creatorId = report.userId;
      // avoid duplicate if assignee is same as creator
      if (!assigneeId || assigneeId !== creatorId) {
        const creatorNote = { id: nanoid(), userId: creatorId, type: 'assignment_created_for_report', message: `Your report ${reportId} has been assigned`, read: false, createdAt: new Date().toISOString(), reportId, reportCreatorId: creatorId, meta: { reportId, assignmentId: assignment.id } };
        await getDb().collection('notifications').insertOne(creatorNote);
        sendSse(creatorId, 'notification', creatorNote);
      }
    }
  } catch (e) { appendLog('assign-notify-report-owner-failed', { err: e && e.message }); }
  res.json(assignment);
});

app.post('/api/assignments/:id/claim', authMiddleware, requireRole('authority','field_official'), async (req, res) => {
  const id = req.params.id;
  const update = { $set: { assigneeId: req.user.id, status: 'in_progress', claimedAt: new Date().toISOString() } };
  const r = await getDb().collection('assignments').findOneAndUpdate({ id }, update, { returnDocument: 'after' });
  if (!r.value) return res.status(404).json({ error: 'Not found' });
  // notify creator that assignment was claimed
  if (r.value.creatorId) {
    const note = { id: nanoid(), userId: r.value.creatorId, type: 'assignment_claimed', message: `Assignment ${r.value.id} claimed by ${req.user.name}`, read: false, createdAt: new Date().toISOString(), meta: { assignmentId: r.value.id, reportId: r.value.reportId } };
    await getDb().collection('notifications').insertOne(note);
    sendSse(r.value.creatorId, 'notification', note);
  }
  // also notify report owner
  try {
    const report = await getDb().collection('reports').findOne({ id: r.value.reportId });
    if (report && report.userId) {
      const ownerNote = { id: nanoid(), userId: report.userId, type: 'assignment_claimed_for_report', message: `Assignment ${r.value.id} for your report ${r.value.reportId} was claimed`, read: false, createdAt: new Date().toISOString(), reportId: r.value.reportId, reportCreatorId: report.userId, meta: { assignmentId: r.value.id, reportId: r.value.reportId } };
      await getDb().collection('notifications').insertOne(ownerNote);
      sendSse(report.userId, 'notification', ownerNote);
    }
  } catch (e) { appendLog('claim-notify-report-owner-failed', { err: e && e.message }); }
  res.json(r.value);
});

app.post('/api/assignments/:id/complete', authMiddleware, requireRole('authority','field_official'), async (req, res) => {
  const id = req.params.id;
  const { resolution, notes } = req.body || {};
  const update = { $set: { status: 'completed', resolution: resolution || 'resolved', completedAt: new Date().toISOString(), notes: notes || '' } };
  const r = await getDb().collection('assignments').findOneAndUpdate({ id }, update, { returnDocument: 'after' });
  if (!r.value) return res.status(404).json({ error: 'Not found' });
  // also update report status
  await getDb().collection('reports').updateOne({ id: r.value.reportId }, { $set: { status: 'reviewed', reviewedBy: req.user.id, reviewedAt: new Date().toISOString(), reviewResolution: resolution || 'resolved', reviewNotes: notes || '' } });
  // notify creator about completion
  if (r.value.creatorId) {
    const note = { id: nanoid(), userId: r.value.creatorId, type: 'assignment_completed', message: `Assignment ${r.value.id} completed by ${req.user.name}`, read: false, createdAt: new Date().toISOString(), meta: { assignmentId: r.value.id, reportId: r.value.reportId } };
    await getDb().collection('notifications').insertOne(note);
    sendSse(r.value.creatorId, 'notification', note);
  }
  // also notify report owner about completion
  try {
    const report = await getDb().collection('reports').findOne({ id: r.value.reportId });
    if (report && report.userId) {
      const ownerNote = { id: nanoid(), userId: report.userId, type: 'assignment_completed_for_report', message: `Assignment ${r.value.id} for your report ${r.value.reportId} was completed`, read: false, createdAt: new Date().toISOString(), reportId: r.value.reportId, reportCreatorId: report.userId, meta: { assignmentId: r.value.id, reportId: r.value.reportId } };
      await getDb().collection('notifications').insertOne(ownerNote);
      sendSse(report.userId, 'notification', ownerNote);
    }
  } catch (e) { appendLog('complete-notify-report-owner-failed', { err: e && e.message }); }
  res.json(r.value);
});

// Authority-level report review (approve/reject)
app.post('/api/reports/:id/review', authMiddleware, requireRole('authority'), async (req, res) => {
  const id = req.params.id;
  const { action, notes } = req.body || {};
  if (!['approve','reject'].includes(action)) return res.status(400).json({ error: 'Invalid action' });
  const resolution = action === 'approve' ? 'approved' : 'rejected';
  const r = await getDb().collection('reports').findOneAndUpdate({ id }, { $set: { status: resolution, reviewedBy: req.user.id, reviewedAt: new Date().toISOString(), reviewNotes: notes || '' } }, { returnDocument: 'after' });
  if (!r.value) return res.status(404).json({ error: 'Report not found' });
  // notify report owner
  const reportOwner = await getDb().collection('users').findOne({ id: r.value.userId });
  if (reportOwner) {
    const ownerId = reportOwner.id || reportOwner._id;
    const note = { id: nanoid(), userId: ownerId, type: 'report_review', message: `Your report ${r.value.id} was ${resolution}`, read: false, createdAt: new Date().toISOString(), meta: { reportId: r.value.id, resolution } };
    await getDb().collection('notifications').insertOne(note);
    sendSse(ownerId, 'notification', note);
  }
  res.json(r.value);
});

// list users (for assignee lookup)
app.get('/api/users', authMiddleware, requireRole('authority'), async (req, res) => {
  const users = await getDb().collection('users').find({}, { projection: { passwordHash: 0 } }).toArray();
  res.json(users || []);
});

// notifications
app.get('/api/notifications', authMiddleware, async (req, res) => {
  const unreadOnly = req.query.unread === 'true';
  const q = { userId: req.user.id };
  if (unreadOnly) q.read = false;
  const items = await getDb().collection('notifications').find(q).sort({ createdAt: -1 }).toArray();
  res.json(items || []);
});

app.post('/api/notifications/:id/read', authMiddleware, async (req, res) => {
  const id = req.params.id;
  const r = await getDb().collection('notifications').findOneAndUpdate({ id, userId: req.user.id }, { $set: { read: true, readAt: new Date().toISOString() } }, { returnDocument: 'after' });
  if (!r.value) return res.status(404).json({ error: 'Not found' });
  res.json(r.value);
});

app.post('/api/reports', authMiddleware, async (req, res) => {
  const {
    category,
    description,
    location,
    severity,
    evidenceUrl,
    captureTimestamp,
    captureMetadata,
    aiAnalysis,
    detectedCategory
  } = req.body;

  if (!category || !description) return res.status(400).json({ error: 'Missing fields' });

  // If evidence URL provided, trigger Hugging Face image analysis backend service if not already provided
  let hfResult = aiAnalysis;
  if (!hfResult && evidenceUrl) {
    try {
      hfResult = await analyzeImageWithHuggingFace(evidenceUrl, category);
    } catch (e) {
      console.warn('[Backend Report API] Hugging Face inspection fallback:', e.message);
    }
  }

  const report = {
    id: nanoid(),
    userId: req.user.id,
    userName: req.user.name,
    category: detectedCategory || category,
    description,
    location,
    severity: severity || 'moderate',
    evidenceUrl: evidenceUrl || null,
    captureTimestamp: captureTimestamp || null,
    captureMetadata: captureMetadata || null,
    timestamp: new Date().toISOString(),
    status: 'submitted',
    // Required AI Inspection Database Fields
    ai_analysis_status: hfResult?.analysisStatus || 'PENDING',
    ai_model_name: hfResult?.modelName || process.env.HUGGINGFACE_IMAGE_MODEL || 'google/vit-base-patch16-224',
    ai_model_version: 'v1.0.0',
    detected_labels: hfResult?.detectedLabels || [],
    label_confidence: hfResult?.detectedLabels?.[0]?.confidence || hfResult?.hazardConfidence || 0,
    predicted_hazard_type: hfResult?.possibleHazardType || 'UNKNOWN',
    hazard_confidence: hfResult?.hazardConfidence || 0,
    image_relevance: hfResult?.imageRelevance || 'UNKNOWN',
    requires_human_review: true,
    requiresHumanVerification: true,
    ai_processed_at: hfResult?.processedAt || new Date().toISOString(),
    ai_error_message: hfResult?.errorMessage || null,
    summaryMessage: hfResult?.summaryMessage || 'AI screening is temporarily unavailable. Your report has been submitted for manual verification.'
  };

  const created = await insertReportDoc(report);
  res.json(created);
});

// AI Media Inspection Endpoint using Backend Hugging Face Vision Service
app.post('/api/inspect-media', optionalAuthMiddleware, async (req, res) => {
  try {
    const { imageUrl, category, captureMetadata, colorHistogram } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Missing imageUrl' });
    }

    appendLog('inspect-media', { userId: req.user.id, category, hasMetadata: !!captureMetadata });

    // Call Backend Hugging Face Image Analysis Service
    const hfResult = await analyzeImageWithHuggingFace(imageUrl, category, colorHistogram);

    res.json({
      success: true,
      analysisStatus: hfResult.analysisStatus,
      imageRelevance: hfResult.imageRelevance,
      detectedLabels: hfResult.detectedLabels,
      possibleHazardType: hfResult.possibleHazardType,
      hazardConfidence: hfResult.hazardConfidence,
      requiresHumanVerification: true,
      modelName: hfResult.modelName,
      processedAt: hfResult.processedAt,
      summaryMessage: hfResult.summaryMessage,
      errorMessage: hfResult.errorMessage || null,
      ai_result: hfResult
    });

  } catch (err) {
    appendLog('inspect-media-error', { err: err.message });
    res.status(500).json({
      error: 'Media inspection failed',
      message: err.message,
      analysisStatus: 'UNAVAILABLE',
      imageRelevance: 'UNKNOWN',
      detectedLabels: [],
      possibleHazardType: 'UNKNOWN',
      hazardConfidence: 0,
      requiresHumanVerification: true,
      modelName: process.env.HUGGINGFACE_IMAGE_MODEL || 'google/vit-base-patch16-224',
      processedAt: new Date().toISOString(),
      summaryMessage: 'AI screening is temporarily unavailable. Your report has been submitted for manual verification.'
    });
  }
});

// ====================================================
// Shared Evacuation Routing & Map Infrastructure APIs
// ====================================================

// 1. OpenRouteService Directions Proxy
app.post('/api/routes/directions', optionalAuthMiddleware, async (req, res) => {
  try {
    const { start, end } = req.body || {};
    if (!start || !end) return res.status(400).json({ error: 'Missing start or end location coordinates' });

    const routeData = await calculateDirections(start, end);
    res.json({ success: true, ...routeData });
  } catch (err) {
    appendLog('directions-error', { err: err.message });
    res.status(500).json({ error: 'Route service is temporarily unavailable.', message: err.message });
  }
});

// 2. Route Safety Evaluation API
app.post('/api/routes/evaluate-safety', optionalAuthMiddleware, async (req, res) => {
  try {
    const { route } = req.body || {};
    if (!route || !route.geometry) return res.status(400).json({ error: 'Missing route geometry' });

    const roads = (await getDb().collection('roads').find().toArray()) || [];
    const incidents = (await getDb().collection('reports').find().toArray()) || [];
    const riskZones = await getRiskZonesData();

    const evaluation = evaluateRouteSafety(route, roads, incidents, riskZones);
    res.json({ success: true, ...evaluation });
  } catch (err) {
    appendLog('evaluate-safety-error', { err: err.message });
    res.status(500).json({ error: 'Safety evaluation failed', message: err.message });
  }
});

// 3. Alternative Routes Ranking API
app.post('/api/routes/alternatives', optionalAuthMiddleware, async (req, res) => {
  try {
    const { start, end } = req.body || {};
    if (!start || !end) return res.status(400).json({ error: 'Missing start or end coordinates' });

    const primaryRoute = await calculateDirections(start, end);
    const roads = (await getDb().collection('roads').find().toArray()) || [];
    const incidents = (await getDb().collection('reports').find().toArray()) || [];
    const riskZones = await getRiskZonesData();

    const alternatives = rankAlternativeRoutes(primaryRoute, roads, incidents, riskZones);
    res.json({ success: true, count: alternatives.length, routes: alternatives });
  } catch (err) {
    res.status(500).json({ error: 'Alternative route calculation failed', message: err.message });
  }
});

// 4. Roads Database API
app.get('/api/roads', optionalAuthMiddleware, async (req, res) => {
  try {
    const roads = (await getDb().collection('roads').find().toArray()) || [];
    res.json(roads);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch roads' });
  }
});

// Admin update road status
app.patch('/api/roads/:id', authMiddleware, requireRole('authority', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, riskLevel } = req.body || {};
    if (!['operational', 'vulnerable', 'blocked', 'damaged'].includes(status)) {
      return res.status(400).json({ error: 'Invalid road status' });
    }

    const update = { $set: { status, updatedAt: new Date().toISOString(), updatedBy: req.user.name } };
    if (riskLevel) update.$set.riskLevel = riskLevel;

    const r = await getDb().collection('roads').findOneAndUpdate({ id }, update, { returnDocument: 'after' });
    if (!r.value) return res.status(404).json({ error: 'Road not found' });

    // Notify all active clients via SSE
    const clients = await getDb().collection('users').find({}).toArray();
    clients.forEach((u) => sendSse(u.id || u._id, 'road_update', r.value));

    res.json(r.value);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update road status' });
  }
});

// 5. Road Blockages API
app.get('/api/road-blockages', optionalAuthMiddleware, async (req, res) => {
  try {
    const blocked = (await getDb().collection('roads').find({ status: { $in: ['blocked', 'damaged'] } }).toArray()) || [];
    res.json(blocked);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch road blockages' });
  }
});

// 6. Nearby Emergency Incidents API
app.get('/api/incidents/nearby', optionalAuthMiddleware, async (req, res) => {
  try {
    const reports = (await getDb().collection('reports').find().toArray()) || [];
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

// 7. Shelters & Evacuation Centers API
app.get('/api/shelters', optionalAuthMiddleware, async (req, res) => {
  try {
    const shelters = (await getDb().collection('shelters').find().toArray()) || [];
    res.json(shelters);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch shelters' });
  }
});

app.get('/api/shelters/nearby', optionalAuthMiddleware, async (req, res) => {
  try {
    const shelters = (await getDb().collection('shelters').find({ status: 'open' }).toArray()) || [];
    res.json(shelters);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch nearby shelters' });
  }
});

// 8. Hospitals API
app.get('/api/hospitals', optionalAuthMiddleware, async (req, res) => {
  try {
    const hospitals = (await getDb().collection('hospitals').find().toArray()) || [];
    res.json(hospitals);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch hospitals' });
  }
});

app.get('/api/hospitals/nearby', optionalAuthMiddleware, async (req, res) => {
  try {
    const hospitals = (await getDb().collection('hospitals').find().toArray()) || [];
    res.json(hospitals);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch nearby hospitals' });
  }
});

// 9. Evacuation Routes Management API
app.get('/api/evacuation-routes', optionalAuthMiddleware, async (req, res) => {
  try {
    const routes = (await getDb().collection('evacuationRoutes').find({ status: 'published' }).toArray()) || [];
    res.json(routes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch evacuation routes' });
  }
});

// Admin Publish Evacuation Route
app.post('/api/evacuation-routes', authMiddleware, requireRole('authority', 'super_admin'), async (req, res) => {
  try {
    const { title, originName, destinationName, district, coordinates, distanceKm, estHours, warnings } = req.body || {};
    if (!title || !originName || !destinationName) return res.status(400).json({ error: 'Missing route parameters' });

    const newRoute = {
      id: nanoid(),
      title,
      originName,
      destinationName,
      district: district || 'East Khasi Hills',
      coordinates: coordinates || [],
      distanceKm: Number(distanceKm) || 12.0,
      estHours: Number(estHours) || 0.4,
      status: 'published',
      createdBy: req.user.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      safetyRating: 'RECOMMENDED',
      warnings: warnings || ['✓ Verified safe by Emergency Operations Command'],
    };

    await getDb().collection('evacuationRoutes').insertOne(newRoute);

    // Broadcast SSE update
    const users = await getDb().collection('users').find({}).toArray();
    users.forEach((u) => sendSse(u.id || u._id, 'evacuation_route_published', newRoute));

    res.json(newRoute);
  } catch (err) {
    res.status(500).json({ error: 'Failed to publish evacuation route' });
  }
});

// Admin Suspend Evacuation Route
app.patch('/api/evacuation-routes/:id/suspend', authMiddleware, requireRole('authority', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const r = await getDb().collection('evacuationRoutes').findOneAndUpdate({ id }, { $set: { status: 'suspended', updatedAt: new Date().toISOString() } }, { returnDocument: 'after' });
    if (!r.value) return res.status(404).json({ error: 'Route not found' });
    res.json(r.value);
  } catch (err) {
    res.status(500).json({ error: 'Failed to suspend route' });
  }
});

// 10. Live Map State Updates API
app.get('/api/map/updates', optionalAuthMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const roads = await db.collection('roads').find().toArray();
    const blockages = await db.collection('roads').find({ status: { $in: ['blocked', 'damaged'] } }).toArray();
    const incidents = await db.collection('reports').find().toArray();
    const riskZones = await getRiskZonesData();
    const shelters = await db.collection('shelters').find({ status: 'open' }).toArray();
    const hospitals = await db.collection('hospitals').find().toArray();
    const evacuationRoutes = await db.collection('evacuationRoutes').find({ status: 'published' }).toArray();

    res.json({
      timestamp: new Date().toISOString(),
      liveUpdatesEnabled: true,
      counts: {
        roads: roads.length,
        blockages: blockages.length,
        incidents: incidents.length,
        riskZones: riskZones.length,
        shelters: shelters.length,
        hospitals: hospitals.length,
        evacuationRoutes: evacuationRoutes.length,
      },
      roads,
      blockages,
      incidents,
      riskZones,
      shelters,
      hospitals,
      evacuationRoutes,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch map updates' });
  }
});

// ========================================
// ML Prediction API Routes
// ========================================

// Get ML service health and model info
app.get('/api/ml/status', authMiddleware, async (req, res) => {
  const health = await checkMLHealth();
  res.json(health);
});

// Predict risk from environmental features
app.post('/api/predict', authMiddleware, async (req, res) => {
  try {
    const features = req.body;
    const prediction = await predictRisk(features);
    res.json(prediction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch real environmental data for a location and predict risk
app.post('/api/predict/location', authMiddleware, async (req, res) => {
  try {
    const { lat, lng, historicalRisk, satelliteIndicator } = req.body;
    if (!lat || !lng) return res.status(400).json({ error: 'Missing lat/lng' });

    appendLog('predict-location', { lat, lng });

    // Fetch real environmental data
    const envData = await fetchEnvironmentalData({
      lat: Number(lat),
      lng: Number(lng),
      historicalRisk: Number(historicalRisk || 50),
      satelliteIndicator: Number(satelliteIndicator || 50)
    });

    if (!envData) {
      return res.status(500).json({ error: 'Failed to fetch environmental data' });
    }

    // Predict risk using ML model
    const prediction = await predictRisk(envData);

    res.json({
      location: { lat: envData.latitude, lng: envData.longitude },
      environmental_data: envData,
      prediction,
      fetched_at: envData.fetched_at
    });
  } catch (err) {
    appendLog('predict-location-error', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Refresh all risk zones with real data and ML predictions
app.post('/api/risk-zones/refresh', authMiddleware, requireRole('authority'), async (req, res) => {
  try {
    appendLog('refresh-risk-zones-start');

    const zones = await getRiskZonesData();
    if (!zones || zones.length === 0) {
      return res.status(400).json({ error: 'No risk zones to refresh' });
    }

    const locations = zones.map(z => ({
      id: z.id,
      name: z.name,
      lat: z.location.lat,
      lng: z.location.lng,
      historicalRisk: z.historicalRisk || 50,
      satelliteIndicator: z.satelliteIndicator || 50
    }));

    // Fetch environmental data for all zones
    appendLog('fetching-environmental-data', { count: locations.length });
    const envDataResults = await fetchEnvironmentalDataBatch(locations, 1000); // 1s delay between requests

    // Predict risk for all zones
    const predictions = await predictBatch(envDataResults.map(r => r.environmentalData));

    // Update zones in database and check for alerts
    const updatedZones = [];
    const newAlerts = [];

    for (let i = 0; i < envDataResults.length; i++) {
      const result = envDataResults[i];
      const prediction = predictions.predictions[i];
      const zone = zones.find(z => z.id === result.id);

      if (!zone || !prediction) continue;

      const updatedZone = {
        ...zone,
        ...result.environmentalData,
        environmental_data: result.environmentalData,
        prediction,
        riskLevel: prediction.risk_category,
        riskScore: prediction.risk_score,
        confidence: prediction.confidence,
        lastUpdated: new Date().toISOString(),
        dataSource: 'real_api_ml_prediction',
        modelVersion: predictions.model_version
      };

      await getDb().collection('riskZones').updateOne(
        { id: zone.id },
        { $set: updatedZone }
      );

      updatedZones.push(updatedZone);

      // Create alert if risk is critical or high
      if (prediction.risk_category === 'critical' && prediction.risk_score >= 85) {
        const alert = {
          id: nanoid(),
          zoneId: zone.id,
          title: `CRITICAL RISK — ${zone.name}`,
          message: `AI model predicts critical landslide risk (score: ${prediction.risk_score}, confidence: ${(prediction.confidence * 100).toFixed(1)}%). Immediate action required.`,
          riskLevel: 'critical',
          district: zone.location.district,
          location: zone.location,
          timestamp: new Date().toISOString(),
          acknowledged: false,
          dataSource: 'ai_prediction',
          affectedRoads: [],
          affectedVillages: []
        };

        await getDb().collection('alerts').insertOne(alert);
        newAlerts.push(alert);

        // Broadcast via SSE to all authority users
        const authorities = await getDb().collection('users').find({ role: { $in: ['authority', 'super_admin'] } }).toArray();
        authorities.forEach(auth => {
          sendSse(auth.id || auth._id, 'alert', alert);
        });
      }
    }

    appendLog('refresh-risk-zones-complete', { updated: updatedZones.length, alerts: newAlerts.length });

    res.json({
      success: true,
      updated: updatedZones.length,
      zones: updatedZones,
      new_alerts: newAlerts.length,
      alerts: newAlerts,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    appendLog('refresh-risk-zones-error', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reset', authMiddleware, requireRole('admin', 'authority'), async (req, res) => {
  // reset data (admin/authority use)
  await getDb().collection('riskZones').deleteMany({});
  await getDb().collection('alerts').deleteMany({});
  await getDb().collection('reports').deleteMany({});
  res.json({ ok: true });
});

const PORT = process.env.PORT || 4000;
init().then(() => {
  const srv = app.listen(PORT, () => {
    console.log('Server listening on', PORT);
    appendLog('listening', { port: PORT, address: srv.address(), pid: process.pid });
  });
});

// File upload handling: store uploads in server/uploads and return signed download URL
const uploadsDir = path.join(__dirname, 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${nanoid()}${path.extname(file.originalname).toLowerCase()}`),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

app.post('/api/upload', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const filename = req.file.filename;
  // signed token valid for 1 hour
  const token = jwt.sign({ filename }, SECRET, { expiresIn: '1h' });
  const url = `/api/uploads/${encodeURIComponent(filename)}?token=${token}`;
  res.json({ url, filename });
});

app.get('/api/uploads/:filename', (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(401).send('Unauthorized');
  try {
    const decoded = jwt.verify(String(token), SECRET);
    if (decoded.filename !== req.params.filename) return res.status(401).send('Unauthorized');
    const filePath = path.join(uploadsDir, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).send('Not found');
    return res.sendFile(filePath);
  } catch (e) {
    return res.status(401).send('Unauthorized');
  }
});
