(async function(){
  try{
    const base = 'http://localhost:4000';
    const loginRes = await fetch(`${base}/api/login`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:'admin@example.com', password:'adminpass'})});
    const login = await loginRes.json();
    console.log('login:', login);
    const token = login.token;
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type':'application/json' };
    const reportsRes = await fetch(`${base}/api/reports`, { headers });
    const reports = await reportsRes.json();
    console.log('reports:', reports);
    const reportId = reports && reports.length ? reports[0].id : null;
    if(!reportId){ console.log('no report to assign'); return }
    const createRes = await fetch(`${base}/api/assignments`, { method:'POST', headers, body: JSON.stringify({ reportId }) });
    const assignment = await createRes.json();
    console.log('assignment created:', assignment);
    const listRes = await fetch(`${base}/api/assignments`, { headers });
    const list = await listRes.json();
    console.log('assignments list:', list);
  }catch(e){ console.error(e); process.exit(1) }
})();
