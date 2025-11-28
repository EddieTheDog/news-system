const socket = io();
let adminPassword = '';

const connectBtn = document.getElementById('connect');
const passInput = document.getElementById('admin-pass');
const startBtn = document.getElementById('start');
const stopBtn = document.getElementById('stop');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const tickerIn = document.getElementById('ticker-input');
const setTickerBtn = document.getElementById('set-ticker');
const uploadBtn = document.getElementById('upload');
const videoFile = document.getElementById('video-file');
const videoTitle = document.getElementById('video-title');
const uploadMsg = document.getElementById('upload-msg');
const plEl = document.getElementById('pl');

connectBtn.onclick = () => {
  adminPassword = passInput.value.trim();
  if (!adminPassword) return alert('Enter admin password');
  alert('Connected as admin (password sent via requests).');
  refreshState();
};

function sendApi(path, data) {
  data.admin_password = adminPassword;
  return fetch(path, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
  }).then(r=>r.json());
}

startBtn.onclick = () => sendApi('/api/control', { action: 'start' }).then(refreshState);
stopBtn.onclick = () => sendApi('/api/control', { action: 'stop' }).then(refreshState);
prevBtn.onclick = () => sendApi('/api/control', { action: 'prev' }).then(refreshState);
nextBtn.onclick = () => sendApi('/api/control', { action: 'next' }).then(refreshState);
setTickerBtn.onclick = () => sendApi('/api/ticker', { ticker: tickerIn.value }).then(()=>alert('Ticker updated'));

uploadBtn.onclick = async () => {
  if (!videoFile.files || !videoFile.files[0]) return alert('Choose a file');
  const f = videoFile.files[0];
  const form = new FormData();
  form.append('video', f);
  form.append('title', videoTitle.value || f.name);
  form.append('admin_password', adminPassword);
  const res = await fetch('/api/upload', { method:'POST', body: form });
  const j = await res.json();
  if (!res.ok) return alert(JSON.stringify(j));
  uploadMsg.textContent = 'Upload successful';
  videoFile.value = '';
  videoTitle.value = '';
  refreshState();
};

function refreshState() {
  fetch('/api/state').then(r=>r.json()).then(s=>{
    renderPlaylist(s.playlist || []);
    tickerIn.value = s.ticker || '';
  });
}

function renderPlaylist(pl) {
  plEl.innerHTML = '';
  pl.forEach((it, idx)=>{
    const li = document.createElement('li');
    li.style.display='flex';
    li.style.justifyContent='space-between';
    li.style.alignItems='center';
    li.style.padding='6px';
    li.style.marginBottom='6px';
    li.style.background='#161616';
    li.innerHTML = `<div>${idx+1}. ${it.title}</div>`;
    const controls = document.createElement('div');
    const gotoBtn = document.createElement('button');
    gotoBtn.textContent='Play'; gotoBtn.className='btn small';
    gotoBtn.onclick = ()=>sendApi('/api/control',{action:'goto',index:idx}).then(()=>sendApi('/api/control',{action:'start'}));
    const delBtn = document.createElement('button');
    delBtn.textContent='Del'; delBtn.className='btn small';
    delBtn.onclick = ()=>sendApi('/api/remove',{id:it.id}).then(refreshState);
    controls.appendChild(gotoBtn); controls.appendChild(delBtn);
    li.appendChild(controls);
    plEl.appendChild(li);
  });
}

socket.on('state-update', refreshState);
socket.on('playlist-update', refreshState);

refreshState();
