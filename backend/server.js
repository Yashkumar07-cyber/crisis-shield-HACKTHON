const app = require('./app');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { startAITracker } = require('./controllers/alertController');

const PORT = process.env.PORT || 5001;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log(`🔌 Connected: ${socket.id}`);
});

// DB connect + server start + AI tracker shuru
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚨 Crisis Shield Backend running on port ${PORT}`);
    // AI Tracker start karo server ke saath
    startAITracker(io);
  });
});