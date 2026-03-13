
// ── LANDING ↔ DASHBOARD ─────────────────
function enterDashboard(){
  document.getElementById('landing').style.display='none';
  const app=document.getElementById('app');
  app.style.display='flex';
}
function goHome(){
  document.getElementById('app').style.display='none';
  document.getElementById('landing').style.display='flex';
  window.scrollTo({top:0,behavior:'smooth'});
}

// ── DROPDOWN TOGGLE ─────────────────────
function toggleDD(id){
  const grp=document.getElementById(id);
  const isOpen=grp.classList.contains('open');
  closeAll();
  if(!isOpen) grp.classList.add('open');
}
function closeAll(){
  document.querySelectorAll('.nav-group').forEach(g=>g.classList.remove('open'));
}
document.addEventListener('click',e=>{
  if(!e.target.closest('.nav-group')) closeAll();
});

// ── PAGE NAVIGATION ─────────────────────
function showPage(id){
  document.querySelectorAll('.apage').forEach(p=>p.classList.remove('active'));
  const el=document.getElementById('apage-'+id);
  if(el) el.classList.add('active');
  // update direct btn
  document.querySelectorAll('.nav-direct-btn').forEach(b=>b.classList.remove('active'));
  if(id==='dashboard') document.getElementById('nav-dash').classList.add('active');
  closeAll();
}
function setActiveDirect(btn){
  document.querySelectorAll('.nav-direct-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}

// ── DONOR TYPE TOGGLE ───────────────────
function toggleDT(){
  const v=document.getElementById('dtype').value;
  document.getElementById('lfield').style.display=v==='living'?'':'none';
  document.getElementById('dfield').style.display=v==='deceased'?'':'none';
}

// ── FORM SUCCESS ────────────────────────
function ok(id){
  const el=document.getElementById(id);
  el.style.display='block';
  setTimeout(()=>el.style.display='none',3500);
}
