const fs = require('fs');
const path = require('path');

const docxSeedPath = path.join(__dirname, 'seeds', 'docx_seed.json');
const outDbPath = path.join(__dirname, 'db.json');

if (!fs.existsSync(docxSeedPath)) {
  console.error('Parsed docx seed not found:', docxSeedPath);
  process.exit(1);
}

const raw = fs.readFileSync(docxSeedPath, 'utf8');
const parsed = JSON.parse(raw);

// Build basic structured seeds: riskZones from sections, empty alerts, keep users from existing db.json
let db = { users: [], riskZones: [], alerts: [], reports: [] };

// keep existing users if present
const existingDbPath = path.join(__dirname, 'db.json');
if (fs.existsSync(existingDbPath)) {
  try { db = JSON.parse(fs.readFileSync(existingDbPath, 'utf8')); } catch (e) {}
}

// create risk zones from sections (skip Intro)
let idx = 1;
for (const s of parsed.sections) {
  if (!s.title || s.title.toLowerCase().includes('intro')) continue;
  const zone = {
    id: `rz-${idx}`,
    name: s.title,
    description: s.body ? s.body.slice(0, 800) : '',
    location: { lat: 26.5 + (idx * 0.01), lng: 92.6 + (idx * 0.01) },
    severityScore: Math.round(Math.random() * 100),
    createdAt: new Date().toISOString()
  };
  db.riskZones.push(zone);
  idx++;
}

// generate one example alert per zone
for (const z of db.riskZones) {
  db.alerts.push({ id: `a-${z.id}`, zoneId: z.id, message: `Auto alert for ${z.name}`, level: 'warning', timestamp: new Date().toISOString() });
}

// leave reports empty; frontend/report can create them
fs.writeFileSync(outDbPath, JSON.stringify(db, null, 2));
console.log('Wrote structured db.json with', db.riskZones.length, 'riskZones and', db.alerts.length, 'alerts to', outDbPath);
