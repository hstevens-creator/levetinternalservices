const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const { initializeDatabase, pool } = require('./config/database');
const { startCronJobs } = require('./services/cronJobs');

const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const placementRoutes = require('./routes/placements');
const screenRoutes = require('./routes/screens');
const campaignRoutes = require('./routes/campaigns');
const dashboardRoutes = require('./routes/dashboard');
const playlistRoutes = require('./routes/playlist');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.set('io', io);

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/placements', placementRoutes);
app.use('/api/screens', screenRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/playlist', playlistRoutes);

const connectedScreens = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('screen:register', async (data) => {
    const { screenId, playerKey } = data;
    
    try {
      const result = await pool.query(
        'SELECT * FROM screens WHERE id = $1 AND player_key = $2',
        [screenId, playerKey]
      );

      if (result.rows.length > 0) {
        connectedScreens.set(socket.id, { screenId, playerKey });
        socket.join(`screen-${screenId}`);
        
        await pool.query(
          'UPDATE screens SET online = true, last_seen = CURRENT_TIMESTAMP WHERE id = $1',
          [screenId]
        );

        socket.emit('screen:registered', { success: true });
        console.log(`Screen ${screenId} registered`);
      } else {
        socket.emit('screen:registered', { success: false, error: 'Invalid credentials' });
      }
    } catch (err) {
      console.error('Error registering screen:', err);
      socket.emit('screen:registered', { success: false, error: 'Server error' });
    }
  });

  socket.on('screen:heartbeat', async (data) => {
    const screenInfo = connectedScreens.get(socket.id);
    if (screenInfo) {
      try {
        await pool.query(
          'UPDATE screens SET last_seen = CURRENT_TIMESTAMP WHERE id = $1',
          [screenInfo.screenId]
        );
      } catch (err) {
        console.error('Error updating heartbeat:', err);
      }
    }
  });

  socket.on('screen:error', async (data) => {
    const screenInfo = connectedScreens.get(socket.id);
    if (screenInfo) {
      try {
        await pool.query(
          `INSERT INTO events (type, payload) 
           VALUES ('screen_error', $1)`,
          [JSON.stringify({ screenId: screenInfo.screenId, error: data, timestamp: new Date().toISOString() })]
        );
        
        console.error(`Screen ${screenInfo.screenId} error:`, data);
      } catch (err) {
        console.error('Error logging screen error:', err);
      }
    }
  });

  socket.on('disconnect', async () => {
    const screenInfo = connectedScreens.get(socket.id);
    if (screenInfo) {
      try {
        await pool.query(
          'UPDATE screens SET online = false WHERE id = $1',
          [screenInfo.screenId]
        );
        console.log(`Screen ${screenInfo.screenId} disconnected`);
      } catch (err) {
        console.error('Error handling disconnect:', err);
      }
      connectedScreens.delete(socket.id);
    }
  });
});

app.post('/api/screens/:id/push-content', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    io.to(`screen-${id}`).emit('content:update', content);

    await pool.query(
      `INSERT INTO events (type, payload) 
       VALUES ('content_push', $1)`,
      [JSON.stringify({ screenId: id, content, timestamp: new Date().toISOString() })]
    );

    res.json({ success: true, message: 'Content pushed to screen' });
  } catch (err) {
    console.error('Error pushing content:', err);
    res.status(500).json({ error: 'Failed to push content' });
  }
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await initializeDatabase();
    startCronJobs();
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();

module.exports = { app, io };
