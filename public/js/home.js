const socket = io();

const video = document.getElementById('main-video');
const tickerText = document.getElementById('ticker-text');
const nowTitle = document.getElementById('now-title');
const statusEl = document.getElementById('status');
const playlistEl = document.getElementById('playlist');

let state = null;

function renderPlaylist(pl) {
  playlistEl.innerHTML = '';
  pl.forEach((item, idx) => {
    const li = document.createElement('li');
    li.textContent = `${idx+1}. ${item.title}`;
    if (state && state.currentIndex === idx) li.style.border = '1px solid #1f7aec';
    playlistEl.appendChild(li);
  });
}

function applyState(s) {
  state = s;
  tickerText.textContent = s.ticker || '';
  renderPlaylist(s.playlist || []);
  if (s.playlist && s.playlist.length > 0) {
    const cur = s.playlist[s.currentIndex] || s.playlist[0];
    nowTitle.textContent = cur ? cur.title : '—';
    const src = cur ? `/uploads/${cur.filename}` : null;
    if (src && video.src !== src) {
      video.src = src;
      if (s.playing) video.play().catch(()=>{});
      else video.pause();
    } else {
      if (s.playing) video.play().catch(()=>{});
      else video.pause();
    }
    statusEl.textContent = s.playing ? 'Live' : 'Paused';
  } else {
    nowTitle.textContent = 'No videos in playlist';
    video.removeAttribute('src');
    statusEl.textContent = 'Stopped';
  }
}

socket.on('state-update', applyState);
socket.on('playlist-update', () => fetch('/api/state').then(r=>r.json()).then(applyState));
socket.on('ticker-update', (t) => tickerText.textContent = t);

fetch('/api/state').then(r=>r.json()).then(applyState);
