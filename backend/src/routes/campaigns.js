const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { placement_id } = req.query;
    let query = 'SELECT * FROM campaigns';
    const params = [];

    if (placement_id) {
      query += ' WHERE placement_id = $1';
      params.push(placement_id);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching campaigns:', err);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

router.post('/', authenticateToken, authorizeRole('admin', 'staff'), async (req, res) => {
  try {
    const { placement_id, content_url, type, duration, weight, active } = req.body;

    if (!placement_id || !content_url) {
      return res.status(400).json({ error: 'placement_id and content_url are required' });
    }

    const result = await pool.query(
      `INSERT INTO campaigns (placement_id, content_url, type, duration, weight, active) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [placement_id, content_url, type || 'video', duration || 10, weight || 1, active !== false]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating campaign:', err);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

router.put('/:id', authenticateToken, authorizeRole('admin', 'staff'), async (req, res) => {
  try {
    const { id } = req.params;
    const { content_url, type, duration, weight, active } = req.body;

    const result = await pool.query(
      `UPDATE campaigns 
       SET content_url = COALESCE($1, content_url),
           type = COALESCE($2, type),
           duration = COALESCE($3, duration),
           weight = COALESCE($4, weight),
           active = COALESCE($5, active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 RETURNING *`,
      [content_url, type, duration, weight, active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating campaign:', err);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM campaigns WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({ message: 'Campaign deleted successfully' });
  } catch (err) {
    console.error('Error deleting campaign:', err);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

module.exports = router;
