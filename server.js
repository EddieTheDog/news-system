require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { Server } = require('socket.io');
const cors = require('cors');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Ensure upload dir exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Simple in-memory playlist/state
let state = {
  playing: false,
  currentIndex: 0,
  playlist: [], // { id, filename, title, duration (optional) }
  ticker: 'Welcome to our channel',
  lastActionAt: Date.now()
};

// CORS for control page if you open from another origin during testing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR)); // serve uploaded videos

// Serve homepage and control HTML
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/control', (req, res) => res.sendFile(path.join(__dirname, 'public', 'control.html')));

// Admin auth middleware for API endpoints (very simple)
function adminAuth(req, res, next) {
  const pass = req.headers['x-admin-password'] || req.query.admin_password || req.body.admin_password;
  if (!pass || pass !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// Multer setup (store files in uploads directory with original filename timestamp)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, safe);
  }
});
const upload = multer({ storage });

// Upload endpoint (admin)
app.post('/api/upload', adminAuth, upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const id = Date.now().toString();
  const entry = {
    id,
    filename: req.file.filename,
    title: req.body.title || req.file.originalname,
    uploadedAt: new Date().toISOString()
  };
  state.playlist.push(entry);
  state.lastActionAt = Date.now();
  io.emit('playlist-update', state);
  res.json({ ok: true, file: entry });
});

// Get state (anyone)
app.get('/api/state', (req, res) => {
  res.json(state);
});

// Admin: update ticker
app.post('/api/ticker', adminAuth, (req, res) => {
  const { ticker } = req.body;
  state.ticker = ticker || '';
  state.lastActionAt = Date.now();
  io.emit('ticker-update', state.ticker);
  res.json({ ok: true });
});

// Admin: reorder playlist (send array of ids)
app.post('/api/reorder', adminAuth, (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) return res.status(400).json({ error: 'Order must be array of ids' });
  const map = state.playlist.reduce((m, it) => { m[it.id] = it; return m; }, {});
  state.playlist = order.map(id => map[id]).filter(Boolean);
  state.lastActionAt = Date.now();
  io.emit('playlist-update', state);
  res.json({ ok: true, playlist: state.playlist });
});

// Admin: remove item
app.post('/api/remove', adminAuth, (req, res) => {
  const { id } = req.body;
  state.playlist = state.playlist.filter(it => it.id !== id);
  state.lastActionAt = Date.now();
  io.emit('playlist-update', state);
  res.json({ ok: true });
});

// Admin: control playback
app.post('/api/control', adminAuth, (req, res) => {
  const { action, index } = req.body;
  if (action === 'start') state.playing = true;
  else if (action === 'stop') state.playing = false;
  else if (action === 'goto' && typeof index === 'number') state.currentIndex = Math.max(0, Math.min(index, state.playlist.length - 1));
  else if (action === 'next') state.currentIndex = Math.min(state.playlist.length - 1, state.currentIndex + 1);
  else if (action === 'prev') state.currentIndex = Math.max(0, state.currentIndex - 1);
  else if (action === 'play') state.playing = true;
  else if (action === 'pause') state.playing = false;
  // broadcast new state
  state.lastActionAt = Date.now();
  io.emit('state-update', state);
  res.json({ ok: true, state });
});

// Socket.io connections
io.on('connection', (socket) => {
  console.log('client connected', socket.id);
  // send initial state
  socket.emit('state-update', state);

  // allow admin sockets to send commands too (for realtime control)
  socket.on('admin-command', (data) => {
    // expect { password, action, ... }
    if (!data || data.password !== ADMIN_PASSWORD) {
      socket.emit('error', 'unauthorized');
      return;
    }
    // For simplicity we reuse the same logic as HTTP endpoints
    const { action } = data;
    if (action === 'start') state.playing = true;
    else if (action === 'stop') state.playing = false;
    else if (action === 'next') state.currentIndex = Math.min(state.playlist.length - 1, state.currentIndex + 1);
    else if (action === 'prev') state.currentIndex = Math.max(0, state.currentIndex - 1);
    else if (action === 'goto' && typeof data.index === 'number') state.currentIndex = Math.max(0, Math.min(data.index, state.playlist.length - 1));
    // broadcast
    state.lastActionAt = Date.now();
    io.emit('state-update', state);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
