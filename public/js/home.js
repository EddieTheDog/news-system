const socket = io();
const video = document.getElementById('main-video');
const ticker = document.getElementById('ticker');
const tickerText = document.getElementById('ticker-text');
const tickerClone = document.getElementById('ticker-text-clone');
const nowTitle = document.getElementById('now-title');
const totalTimeEl = document.getElementById('total-time');

let state = null;
let fakeLiveTime = 0;
let currentIndex = 0;
let isPlaying = true;
let tickerX = 0;

function applyState(s) {
  state = s;

  // Total playtime
  const totalTime = state.playlist.reduce((sum,v)=>sum+(v.duration||0),0);
  totalTimeEl.textContent = totalTime.toFixed(0);

  if(state.playlist.length===0) {
    video.removeAttribute('src');
    nowTitle.textContent = 'No videos';
    return;
  }
}

socket.on('state-update', applyState);
socket.on('ticker-update', t => {
  tickerText.textContent = t + ' — ';
  tickerClone.textContent = t + ' — ';
});

fetch('/api/state').then(r=>r.json()).then(applyState);

// Ticker animation
function animateTicker() {
  tickerX -= 1;
  const width = tickerText.offsetWidth;
  if(tickerX <= -width) tickerX = 0;
  ticker.style.transform = `translateX(${tickerX}px)`;
  requestAnimationFrame(animateTicker);
}
animateTicker();

// Fake-live video logic
function updateFakeLive() {
  if(!state || state.playlist.length===0) return;
  if(state.playing) fakeLiveTime += 0.2;

  let total = 0;
  for (let i = 0; i < state.playlist.length; i++) {
    const videoEntry = state.playlist[i];
    total += videoEntry.duration || video.duration || 0;
    if (fakeLiveTime <= total) {
      if (currentIndex !== i) {
        currentIndex = i;
        video.src = `/uploads/${videoEntry.filename}`;
        video.currentTime = fakeLiveTime - (total - (videoEntry.duration || 0));
        video.play().catch(()=>{});
      } else if(!video.paused) {
        video.currentTime = fakeLiveTime - (total - (videoEntry.duration || 0));
      }
      nowTitle.textContent = videoEntry.title;
      break;
    }
  }

  requestAnimationFrame(updateFakeLive);
}

// Prevent skipping ahead
video.addEventListener('seeking', e => {
  const allowedTime = fakeLiveTime - state.playlist.slice(currentIndex+1).reduce((sum,v)=>sum+(v.duration||0),0);
  if(video.currentTime > allowedTime) video.currentTime = allowedTime;
});

// Pause/resume
video.addEventListener('pause', () => isPlaying = false);
video.addEventListener('play', () => isPlaying = true);

updateFakeLive();
