const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const docxPath = path.join(__dirname, '..', '..', 'PS_26001_AI_Landslide_Risk_Monitoring_System.docx');
const outDir = path.join(__dirname, 'seeds');

(async function(){
  if (!fs.existsSync(docxPath)) {
    console.error('DOCX not found at', docxPath);
    process.exit(1);
  }
  try {
    const result = await mammoth.extractRawText({ path: docxPath });
    const text = result.value;
    // naive split into sections: lines that look like headings (all caps or numbered)
    const lines = text.split(/\r?\n/);
    const sections = [];
    let current = { title: 'Intro', body: [] };
    const headingRegex = /^(\d+\.|[A-Z\s]{4,}|[A-Z0-9][A-Z0-9\s\-]{3,})$/;
    for (let i=0;i<lines.length;i++){
      const l = lines[i].trim();
      if (!l) { if (current.body.length>0) current.body.push('\n'); continue; }
      if (headingRegex.test(l)) {
        // start new section
        if (current.body.length || current.title) sections.push({ title: current.title, body: current.body.join('\n').trim() });
        current = { title: l, body: [] };
      } else {
        current.body.push(l);
      }
    }
    if (current.body.length || current.title) sections.push({ title: current.title, body: current.body.join('\n').trim() });

    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'docx_seed.json');
    fs.writeFileSync(outPath, JSON.stringify({ extractedAt: new Date().toISOString(), sections }, null, 2));
    console.log('Wrote seed to', outPath);
  } catch (e) {
    console.error('Parse failed', e.message);
    process.exit(1);
  }
})();
