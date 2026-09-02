(async function(){
  try{
    const base = 'http://localhost:4000';
    const loginRes = await (await fetch(`${base}/api/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@example.com',password:'adminpass'})})).json();
    const token = loginRes.token;
    console.log('token:', !!token);
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const rep = await (await fetch(`${base}/api/reports`, { method: 'POST', headers, body: JSON.stringify({ category: 'landslide', description: 'test via script', location: { district: 'test' }, severity: 'high' }) })).json();
    console.log('created report', rep.id || rep);
    const users = await (await fetch(`${base}/api/users`, { headers: { Authorization: `Bearer ${token}` } })).json();
    console.log('users count', users.length);
    const asg = await (await fetch(`${base}/api/assignments`, { method: 'POST', headers, body: JSON.stringify({ reportId: rep.id, assigneeId: users[0].id }) })).json();
    console.log('assignment created', asg.id);
    const notes = await (await fetch(`${base}/api/notifications?unread=true`, { headers: { Authorization: `Bearer ${token}` } })).json();
    console.log('notifications (unread) count for admin:', notes.length);
  }catch(e){ console.error(e); process.exit(1) }
})();
