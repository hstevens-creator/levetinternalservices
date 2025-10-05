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

module.exports = router;
