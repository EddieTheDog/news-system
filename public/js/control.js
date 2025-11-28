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

function sendApi(path, data={}) {
  return fetch(path, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(data)
  }).then(refreshState);
}

startBtn.onclick = () => sendApi('/api/control',{action:'start'});
stopBtn.onclick = () => sendApi('/api/control',{action:'stop'});
prevBtn.onclick = () => sendApi('/api/control',{action:'prev'});
nextBtn.onclick = () => sendApi('/api/control',{action:'next'});
setTickerBtn.onclick = () => sendApi('/api/ticker',{ticker:tickerIn.value});

uploadBtn.onclick = async () => {
  if (!videoFile.files[0]) return alert('Choose a file');
  const form = new FormData();
  form.append('video', videoFile.files[0]);
  form.append('title', videoTitle.value || videoFile.files[0].name);
  const res = await fetch('/api/upload',{method:'POST',body:form});
  const j = await res.json();
  if (!res.ok) return alert(JSON.stringify(j));
  uploadMsg.textContent = 'Upload successful';
  videoFile.value=''; videoTitle.value='';
  refreshState();
};

function renderPlaylist(pl) {
  plEl.innerHTML='';
  pl.forEach((v, idx)=>{
    const li=document.createElement('li');
    li.style.display='flex';
    li.style.justifyContent='space-between';
    li.style.alignItems='center';
    li.style.padding='6px'; li.style.marginBottom='6px';
    li.style.background='#161616';
    li.innerHTML=`<div>${idx+1}. ${v.title}</div>`;
    const controls=document.createElement('div');

    const playBtn=document.createElement('button');
    playBtn.textContent='Go'; playBtn.className='btn small';
    playBtn.onclick=()=>sendApi('/api/control',{action:'goto',index:idx});
    
    const upBtn=document.createElement('button');
    upBtn.textContent='↑'; upBtn.className='btn small';
    upBtn.onclick=()=>move(idx,-1);
    
    const downBtn=document.createElement('button');
    downBtn.textContent='↓'; downBtn.className='btn small';
    downBtn.onclick=()=>move(idx,1);
    
    const delBtn=document.createElement('button');
    delBtn.textContent='Del'; delBtn.className='btn small';
    delBtn.onclick=()=>sendApi('/api/remove',{id:v.id});

    controls.appendChild(playBtn);
    controls.appendChild(upBtn);
    controls.appendChild(downBtn);
    controls.appendChild(delBtn);
    li.appendChild(controls);
    plEl.appendChild(li);
  });
}

function move(idx, dir){
  fetch('/api/state').then(r=>r.json()).then(s=>{
    const order = s.playlist.map(v=>v.id);
    const newIdx=idx+dir;
    if(newIdx<0 || newIdx>=order.length) return;
    [order[idx],order[newIdx]]=[order[newIdx],order[idx]];
    sendApi('/api/reorder',{order});
  });
}

function refreshState(){
  fetch('/api/state').then(r=>r.json()).then(s=>{
    tickerIn.value=s.ticker||'';
    renderPlaylist(s.playlist||[]);
  });
}

socket.on('playlist-update',refreshState);
socket.on('state-update',refreshState);
socket.on('ticker-update',t=>tickerIn.value=t);
refreshState();
