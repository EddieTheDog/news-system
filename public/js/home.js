const socket = io();
const video = document.getElementById('main-video');
const tickerText = document.getElementById('ticker-text');
const nowTitle = document.getElementById('now-title');
const totalTimeEl = document.getElementById('total-time');

let state = null;
let fakeTime = 0;
let tickerPos = window.innerWidth;

function applyState(s) {
  state = s;

  // Calculate total playtime
  const totalTime = state.playlist.reduce((sum,v)=>sum+(v.duration||0),0);
  totalTimeEl.textContent = totalTime.toFixed(0);

  // Current video
  if (state.playlist.length===0) {
    video.removeAttribute('src');
    nowTitle.textContent = 'No videos';
    return;
  }
  const cur = state.playlist[state.currentIndex];
  nowTitle.textContent = cur.title;
  const src = `/uploads/${cur.filename}`;
  if(video.src!==src) video.src=src;

  if(state.playing) video.play().catch(()=>{});
  else video.pause();
}

// Fake live ticker animation
function animateTicker() {
  tickerPos -= 1;
  if(tickerPos < -tickerText.offsetWidth) tickerPos = window.innerWidth;
  tickerText.style.transform = `translateX(${tickerPos}px)`;
  requestAnimationFrame(animateTicker);
}

// Simulate continuous fake-live playback
function updateFakeLive() {
  if(!state || state.playlist.length===0) return;
  if(state.playing){
    fakeTime += 0.2;
    const curVideo = state.playlist[state.currentIndex];
    if(fakeTime >= (curVideo.duration||video.duration||0)){
      fakeTime=0;
      state.currentIndex = Math.min(state.currentIndex+1,state.playlist.length-1);
      socket.emit('state-update',state);
      applyState(state);
    }
  }
  requestAnimationFrame(updateFakeLive);
}

socket.on('state-update', applyState);
socket.on('ticker-update', t => tickerText.textContent=t);
fetch('/api/state').then(r=>r.json()).then(applyState);

animateTicker();
updateFakeLive();
