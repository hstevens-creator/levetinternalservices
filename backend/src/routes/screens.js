const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM screens ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching screens:', err);
    res.status(500).json({ error: 'Failed to fetch screens' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM screens WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Screen not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching screen:', err);
    res.status(500).json({ error: 'Failed to fetch screen' });
  }
});

router.post('/', authenticateToken, authorizeRole('admin', 'staff'), async (req, res) => {
  try {
    const { name, location } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Screen name is required' });
    }

    const playerKey = crypto.randomBytes(32).toString('hex');

    const result = await pool.query(
      'INSERT INTO screens (name, location, player_key) VALUES ($1, $2, $3) RETURNING *',
      [name, location, playerKey]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating screen:', err);
    res.status(500).json({ error: 'Failed to create screen' });
  }
});

router.put('/:id', authenticateToken, authorizeRole('admin', 'staff'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, online } = req.body;

    const result = await pool.query(
      `UPDATE screens 
       SET name = COALESCE($1, name),
           location = COALESCE($2, location),
           online = COALESCE($3, online),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [name, location, online, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Screen not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating screen:', err);
    res.status(500).json({ error: 'Failed to update screen' });
  }
});

router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM screens WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Screen not found' });
    }

    res.json({ message: 'Screen deleted successfully' });
  } catch (err) {
    console.error('Error deleting screen:', err);
    res.status(500).json({ error: 'Failed to delete screen' });
  }
});

router.post('/:id/heartbeat', async (req, res) => {
  try {
    const { id } = req.params;
    const { player_key } = req.body;

    if (!player_key) {
      return res.status(400).json({ error: 'Player key is required' });
    }

    const result = await pool.query(
      `UPDATE screens 
       SET online = true, 
           last_seen = CURRENT_TIMESTAMP 
       WHERE id = $1 AND player_key = $2 
       RETURNING *`,
      [id, player_key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Screen not found or invalid player key' });
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Error updating heartbeat:', err);
    res.status(500).json({ error: 'Failed to update heartbeat' });
  }
});

router.post('/:id/restart', authenticateToken, authorizeRole('admin', 'staff'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const screen = await pool.query('SELECT * FROM screens WHERE id = $1', [id]);
    if (screen.rows.length === 0) {
      return res.status(404).json({ error: 'Screen not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`screen-${id}`).emit('screen:restart');
      res.json({ message: 'Restart command sent to screen' });
    } else {
      res.status(500).json({ error: 'Socket.io not available' });
    }
  } catch (err) {
    console.error('Error sending restart command:', err);
    res.status(500).json({ error: 'Failed to send restart command' });
  }
});

router.post('/:id/clear-cache', authenticateToken, authorizeRole('admin', 'staff'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const screen = await pool.query('SELECT * FROM screens WHERE id = $1', [id]);
    if (screen.rows.length === 0) {
      return res.status(404).json({ error: 'Screen not found' });
    }

    await pool.query('DELETE FROM screen_cache WHERE screen_id = $1', [id]);

    const io = req.app.get('io');
    if (io) {
      io.to(`screen-${id}`).emit('screen:clear-cache');
    }

    res.json({ message: 'Cache cleared and command sent to screen' });
  } catch (err) {
    console.error('Error clearing cache:', err);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

router.post('/:id/toggle-debug', authenticateToken, authorizeRole('admin', 'staff'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE screens 
       SET debug_mode = NOT debug_mode, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Screen not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`screen-${id}`).emit('screen:debug-mode', { enabled: result.rows[0].debug_mode });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error toggling debug mode:', err);
    res.status(500).json({ error: 'Failed to toggle debug mode' });
  }
});

router.post('/:id/error-alert', async (req, res) => {
  try {
    const { id } = req.params;
    const { player_key, errorType, errorMessage, errorCount, timestamp } = req.body;

    if (!player_key) {
      return res.status(400).json({ error: 'Player key is required' });
    }

    const screen = await pool.query(
      'SELECT * FROM screens WHERE id = $1 AND player_key = $2',
      [id, player_key]
    );

    if (screen.rows.length === 0) {
      return res.status(404).json({ error: 'Screen not found or invalid key' });
    }

    const screenData = screen.rows[0];
    
    const { sendEmail } = require('../services/notificationService');
    const adminEmails = await pool.query("SELECT email FROM users WHERE role = 'admin'");
    
    const emailContent = `
      <h2>Screen Error Alert</h2>
      <p><strong>Screen:</strong> ${screenData.name}</p>
      <p><strong>Location:</strong> ${screenData.location || 'Unknown'}</p>
      <p><strong>Screen ID:</strong> ${id}</p>
      <p><strong>Error Type:</strong> ${errorType}</p>
      <p><strong>Error Message:</strong> ${errorMessage}</p>
      <p><strong>Error Count:</strong> ${errorCount}</p>
      <p><strong>Timestamp:</strong> ${timestamp}</p>
      <br>
      <p>Please investigate this issue as soon as possible.</p>
    `;

    for (const admin of adminEmails.rows) {
      await sendEmail(
        admin.email,
        `Screen Error: ${screenData.name} - ${errorType}`,
        emailContent
      );
    }

    await pool.query(
      `INSERT INTO events (type, payload) 
       VALUES ('screen_error_alert', $1)`,
      [JSON.stringify({ screenId: id, errorType, errorMessage, errorCount, timestamp })]
    );

    res.json({ success: true, message: 'Alert sent' });
  } catch (err) {
    console.error('Error sending error alert:', err);
    res.status(500).json({ error: 'Failed to send error alert' });
  }
});

module.exports = router;
