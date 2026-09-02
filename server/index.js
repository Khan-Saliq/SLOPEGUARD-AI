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
const { connectMongo, getDb, seedAdminIfEmpty } = require('./mongo');

const app = express();
app.use(cors());
app.use(express.json());

process.on('uncaughtException', (err) => {
  console.error('uncaughtException', err && (err.stack || err.message || err));
});
process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection', reason && (reason.stack || reason.message || reason));
});
const logFile = path.join(__dirname, 'server_runtime.log');
function appendLog(...parts) { try { fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${parts.map(p=>typeof p==='string'?p:JSON.stringify(p)).join(' ')}\n`); } catch (e) { console.error('log write failed', e); } }
appendLog('process-start', { pid: process.pid, argv: process.argv });

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

async function init() {
  const MONGO_URL = process.env.MONGO_URL || process.env.MONGODB_URI || 'mongodb+srv://khansaliq59_db_user:khansaliq59@cluster0.e5qpz18.mongodb.net/?retryWrites=true&w=majority';
  try {
    await connectMongo(MONGO_URL);
    await seedAdminIfEmpty();
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
  return (await getDb().collection('riskZones').find().toArray()) || [];
}

async function getAlertsData() {
  return (await getDb().collection('alerts').find().toArray()) || [];
}

async function getReportsData(user) {
  const role = user.role === 'admin' ? 'authority' : user.role;
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
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
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
    if (roles.includes(r) || roles.includes(req.user.role)) return next();
    return res.status(403).json({ error: 'Forbidden' });
  };
}

app.post('/api/signup', async (req, res) => {
  const { name, email, password, role = 'citizen' } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'Missing fields' });
  const exists = await findUserByEmail(email);
  if (exists) return res.status(400).json({ error: 'User exists' });
  const hash = await bcrypt.hash(password, 8);
  const normalizedRole = role === 'admin' ? 'authority' : role;
  const user = { id: nanoid(), name, email, passwordHash: hash, role: normalizedRole };
  const created = await createUser(user);
  const token = generateToken(user);
  res.json({ token, user: { id: created.id || created._id || user.id, name: user.name, email: user.email, role: user.role } });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const user = await findUserByEmail(email);
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash || '');
  if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
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
  const { category, description, location, severity } = req.body;
  if (!category || !description) return res.status(400).json({ error: 'Missing fields' });
  const report = { id: nanoid(), userId: req.user.id, userName: req.user.name, category, description, location, severity, timestamp: new Date().toISOString(), status: 'submitted' };
  const created = await insertReportDoc(report);
  res.json(created);
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
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
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
