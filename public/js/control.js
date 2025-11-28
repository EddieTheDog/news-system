const socket = io();
let adminPassword = '';
const connectBtn = document.getElementById('connect');
const passInput = document.getElementById('admin-pass');

connectBtn.onclick = () => {
  adminPassword = passInput.value.trim();
  if (!adminPassword) return alert('Enter admin password');
  // send initial auth via socket admin-command so server marks no state but will accept commands
  socket.emit('admin-command', { password: adminPassword, action: 'ping' });
  alert('Connected via socket (note: REST endpoints also require the same password in X-Admin-Password header).');
  refreshState();
};

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

function sendApi(path, data) {
  return fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': adminPassword
    },
    body: JSON.stringify(data)
  }).then(r => {
    if (!r.ok) return r.json().then(j => { throw j; });
    return r.json();
  });
}

startBtn.onclick = () => sendApi('/api/control', { action: 'start' }).then(refreshState).catch(err=>alert(JSON.stringify(err)));
stopBtn.onclick = () => sendApi('/api/control', { action: 'stop' }).then(refreshState).catch(err=>alert(JSON.stringify(err)));
prevBtn.onclick = () => sendApi('/api/control', { action: 'prev' }).then(refreshState).catch(err=>alert(JSON.stringify(err)));
nextBtn.onclick = () => sendApi('/api/control', { action: 'next' }).then(refreshState).catch(err=>alert(JSON.stringify(err)));

setTickerBtn.onclick = () => {
  sendApi('/api/ticker', { ticker: tickerIn.value }).then(()=>{ alert('Ticker set'); }).catch(e=>alert(JSON.stringify(e)));
};

uploadBtn.onclick = async () => {
  if (!videoFile.files || !videoFile.files[0]) return alert('Choose a file');
  const f = videoFile.files[0];
  const form = new FormData();
  form.append('video', f);
  form.append('title', videoTitle.value || f.name);
  // plain fetch with header
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'x-admin-password': adminPassword },
    body: form
  });
  const j = await res.json();
  if (!res.ok) return alert(JSON.stringify(j));
  uploadMsg.textContent = 'Upload successful';
  videoFile.value = '';
  videoTitle.value = '';
  refreshState();
};

function refreshState() {
  fetch('/api/state').then(r=>r.json()).then((s)=>{
    renderPlaylist(s.playlist || []);
    tickerIn.value = s.ticker || '';
  });
}

function renderPlaylist(pl) {
  plEl.innerHTML = '';
  pl.forEach((it, idx) => {
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.justifyContent = 'space-between';
    li.style.alignItems = 'center';
    li.style.padding = '6px';
    li.style.marginBottom = '6px';
    li.style.background = '#161616';
    li.innerHTML = `<div>${idx+1}. ${it.title}</div>`;
    const controls = document.createElement('div');
    const gotoBtn = document.createElement('button');
    gotoBtn.textContent = 'Play';
    gotoBtn.className = 'btn small';
    gotoBtn.onclick = ()=> sendApi('/api/control', { action: 'goto', index: idx }).then(()=>sendApi('/api/control', { action: 'start' })).then(refreshState);
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'btn small';
    removeBtn.onclick = ()=> sendApi('/api/remove', { id: it.id }).then(refreshState);
    controls.appendChild(gotoBtn);
    controls.appendChild(removeBtn);
    li.appendChild(controls);
    plEl.appendChild(li);
  });
}

socket.on('state-update', (s) => {
  // just reflect updated playlist
  renderPlaylist(s.playlist || []);
  tickerIn.value = s.ticker || '';
});

refreshState();
