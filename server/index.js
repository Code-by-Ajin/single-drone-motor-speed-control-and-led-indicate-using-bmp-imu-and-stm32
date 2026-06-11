require('dotenv').config();
const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors     = require('cors');

const morgan   = require('morgan');

const app  = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/thrust_calculator';
const { initSerial, sendCommand } = require('./serial');

// Middleware
const ALLOWED_ORIGINS = [
  'https://thrust-calculator.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'null', // file:// origin
];
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || ALLOWED_ORIGINS.includes(origin)),
  credentials: false
}));

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"]
  }
});

app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/propellers', require('./routes/propellers'));
app.use('/api/calculate',  require('./routes/calculate'));
app.use('/api/sessions',   require('./routes/sessions'));

app.post('/api/throttle', (req, res) => {
  const { value } = req.body;
  if (value !== undefined) {
    sendCommand(`THROTTLE:${value}`);
    res.json({ success: true, command: `THROTTLE:${value}` });
  } else {
    res.status(400).json({ error: 'Value required' });
  }
});

app.post('/api/arm', (req, res) => {
  sendCommand('ARM');
  res.json({ success: true, command: 'ARM' });
});

app.post('/api/disarm', (req, res) => {
  sendCommand('DISARM');
  res.json({ success: true, command: 'DISARM' });
});

app.get('/api/health', (_, res) =>
  res.json({ status: 'ok', time: new Date() })
);

// Root route
app.get('/', (req, res) => {
  res.send('🚀 API is running...');
});

// Start server immediately (don't wait for DB)
server.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);

initSerial(io);

io.on('connection', (socket) => {
  console.log('Web client connected:', socket.id);
  socket.on('set_throttle', (data) => sendCommand(`THROTTLE:${data.value}`));
  socket.on('request_arm', () => sendCommand('ARM'));
  socket.on('request_disarm', () => sendCommand('DISARM'));
});

// Connect DB (non-blocking — server runs even if Atlas is unreachable)
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('⚠️  MongoDB unavailable (propeller search disabled):', err.message));