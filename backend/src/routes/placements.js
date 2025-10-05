const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, client_id, format } = req.query;
    let query = `
      SELECT p.*, c.name as client_name 
      FROM placements p 
      LEFT JOIN clients c ON p.client_id = c.id 
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (client_id) {
      query += ` AND p.client_id = $${paramIndex}`;
      params.push(client_id);
      paramIndex++;
    }

    if (format) {
      query += ` AND p.format = $${paramIndex}`;
      params.push(format);
      paramIndex++;
    }

    query += ' ORDER BY p.start_date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching placements:', err);
    res.status(500).json({ error: 'Failed to fetch placements' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT p.*, c.name as client_name 
       FROM placements p 
       LEFT JOIN clients c ON p.client_id = c.id 
       WHERE p.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Placement not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching placement:', err);
    res.status(500).json({ error: 'Failed to fetch placement' });
  }
});

router.post('/', authenticateToken, authorizeRole('admin', 'staff'), async (req, res) => {
  try {
    const {
      placement_ref,
      format,
      client_id,
      screen_id,
      campaign_name,
      location,
      start_date,
      end_date,
      artwork_url,
      price,
      notes
    } = req.body;

    if (!placement_ref || !format || !campaign_name || !start_date || !end_date) {
      return res.status(400).json({ 
        error: 'placement_ref, format, campaign_name, start_date, and end_date are required' 
      });
    }

    const result = await pool.query(
      `INSERT INTO placements 
       (placement_ref, format, client_id, screen_id, campaign_name, location, start_date, end_date, artwork_url, price, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [placement_ref, format, client_id, screen_id, campaign_name, location, start_date, end_date, artwork_url, price, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Placement reference already exists' });
    }
    console.error('Error creating placement:', err);
    res.status(500).json({ error: 'Failed to create placement' });
  }
});

router.put('/:id', authenticateToken, authorizeRole('admin', 'staff'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      placement_ref,
      format,
      client_id,
      screen_id,
      campaign_name,
      location,
      start_date,
      end_date,
      status,
      artwork_url,
      price,
      notes
    } = req.body;

    const result = await pool.query(
      `UPDATE placements 
       SET placement_ref = COALESCE($1, placement_ref),
           format = COALESCE($2, format),
           client_id = COALESCE($3, client_id),
           screen_id = COALESCE($4, screen_id),
           campaign_name = COALESCE($5, campaign_name),
           location = COALESCE($6, location),
           start_date = COALESCE($7, start_date),
           end_date = COALESCE($8, end_date),
           status = COALESCE($9, status),
           artwork_url = COALESCE($10, artwork_url),
           price = COALESCE($11, price),
           notes = COALESCE($12, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $13 RETURNING *`,
      [placement_ref, format, client_id, screen_id, campaign_name, location, start_date, end_date, status, artwork_url, price, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Placement not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating placement:', err);
    res.status(500).json({ error: 'Failed to update placement' });
  }
});

router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM placements WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Placement not found' });
    }

    res.json({ message: 'Placement deleted successfully' });
  } catch (err) {
    console.error('Error deleting placement:', err);
    res.status(500).json({ error: 'Failed to delete placement' });
  }
});

module.exports = router;
