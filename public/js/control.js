const socket = io();

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

startBtn.onclick = () => sendApi('/api/control', { action: 'start' });
stopBtn.onclick = () => sendApi('/api/control', { action: 'stop' });
prevBtn.onclick = () => sendApi('/api/control', { action: 'prev' });
nextBtn.onclick = () => sendApi('/api/control', { action: 'next' });
setTickerBtn.onclick = () => sendApi('/api/ticker', { ticker: tickerIn.value });

uploadBtn.onclick = async () => {
  if (!videoFile.files[0]) return alert('Choose a file');
  const form = new FormData();
  form.append('video', videoFile.files[0]);
  form.append('title', videoTitle.value || videoFile.files[0].name);
  const res = await fetch('/api/upload', { method:'POST', body: form });
  const j = await res.json();
  if (!res.ok) return alert(JSON.stringify(j));
  uploadMsg.textContent = 'Upload successful';
  videoFile.value = '';
  videoTitle.value = '';
  refreshState();
};

function sendApi(path, data={}) {
  return fetch(path, {
    method:'POST',
    body: JSON.stringify(data),
    headers: {'Content-Type':'application/json'}
  }).then(refreshState);
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
    gotoBtn.onclick = ()=>sendApi('/api/control',{action:'goto',index:idx});
    const delBtn = document.createElement('button');
    delBtn.textContent='Del'; delBtn.className='btn small';
    delBtn.onclick = ()=>fetch('/api/remove',{method:'POST',body:JSON.stringify({id:it.id}),headers:{'Content-Type':'application/json'}}).then(refreshState);
    controls.appendChild(gotoBtn);
    controls.appendChild(delBtn);
    li.appendChild(controls);
    plEl.appendChild(li);
  });
}

function refreshState() {
  fetch('/api/state').then(r=>r.json()).then(s=>{
    renderPlaylist(s.playlist || []);
    tickerIn.value = s.ticker || '';
  });
}

socket.on('playlist-update', refreshState);
socket.on('state-update', refreshState);
socket.on('ticker-update', t => tickerIn.value = t);

refreshState();
