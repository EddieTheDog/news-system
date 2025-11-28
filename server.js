const express = require('express');
const http = require('http');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let state = {
  playing: false,
  currentIndex: 0,
  playlist: [],
  ticker: 'Welcome to the live news broadcast!'
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/control', (req, res) => res.sendFile(path.join(__dirname, 'public', 'control.html')));

// Multer for video upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});
const upload = multer({ storage });

// Upload video
app.post('/api/upload', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const entry = {
    id: Date.now().toString(),
    filename: req.file.filename,
    title: req.body.title || req.file.originalname
  };
  state.playlist.push(entry);
  io.emit('playlist-update', state);
  res.json({ ok: true, file: entry });
});

// Get current state
app.get('/api/state', (req, res) => res.json(state));

// Update ticker
app.post('/api/ticker', (req, res) => {
  state.ticker = req.body.ticker || '';
  io.emit('ticker-update', state.ticker);
  res.json({ ok: true });
});

// Broadcast controls
app.post('/api/control', (req, res) => {
  const { action, index } = req.body;
  if (action === 'start') state.playing = true;
  else if (action === 'stop') state.playing = false;
  else if (action === 'next') state.currentIndex = Math.min(state.playlist.length - 1, state.currentIndex + 1);
  else if (action === 'prev') state.currentIndex = Math.max(0, state.currentIndex - 1);
  else if (action === 'goto' && typeof index === 'number') state.currentIndex = Math.max(0, Math.min(index, state.playlist.length - 1));
  io.emit('state-update', state);
  res.json({ ok: true });
});

// Reorder playlist (move up/down)
app.post('/api/reorder', (req, res) => {
  const { order } = req.body; // array of ids in new order
  if (!Array.isArray(order)) return res.status(400).json({ error: 'Order must be array of ids' });
  const map = state.playlist.reduce((m, v) => { m[v.id] = v; return m; }, {});
  state.playlist = order.map(id => map[id]).filter(Boolean);
  io.emit('playlist-update', state);
  res.json({ ok: true });
});

// Delete video
app.post('/api/remove', (req, res) => {
  const { id } = req.body;
  state.playlist = state.playlist.filter(v => v.id !== id);
  io.emit('playlist-update', state);
  res.json({ ok: true });
});

// Socket connections
io.on('connection', socket => {
  socket.emit('state-update', state);
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
