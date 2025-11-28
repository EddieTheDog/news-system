const socket = io();
const video = document.getElementById('main-video');
const tickerText = document.getElementById('ticker-text');
const nowTitle = document.getElementById('now-title');

let state = null;

function applyState(s) {
  state = s;
  tickerText.textContent = s.ticker || '';
  if (s.playlist.length === 0) {
    video.removeAttribute('src');
    nowTitle.textContent = 'No videos';
    return;
  }
  const cur = s.playlist[s.currentIndex];
  nowTitle.textContent = cur.title;
  const src = `/uploads/${cur.filename}`;
  if (video.src !== src) {
    video.src = src;
    if (s.playing) video.play().catch(()=>{});
    else video.pause();
  }
  else if (s.playing) video.play().catch(()=>{});
  else video.pause();
}

// Infinite smooth ticker
function animateTicker() {
  const span = tickerText;
  span.style.transform = `translateX(${window.innerWidth}px)`;
  let left = window.innerWidth;
  const step = () => {
    left -= 1;
    if (left < -span.offsetWidth) left = window.innerWidth;
    span.style.transform = `translateX(${left}px)`;
    requestAnimationFrame(step);
  };
  step();
}

socket.on('state-update', applyState);
socket.on('ticker-update', t => tickerText.textContent = t);

fetch('/api/state').then(r=>r.json()).then(applyState);
animateTicker();
