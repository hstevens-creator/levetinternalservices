const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM clients ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching clients:', err);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching client:', err);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

router.post('/', authenticateToken, authorizeRole('admin', 'staff'), async (req, res) => {
  try {
    const { name, contact_name, contact_email, contact_phone, address, notes } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Client name is required' });
    }

    const result = await pool.query(
      `INSERT INTO clients (name, contact_name, contact_email, contact_phone, address, notes) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, contact_name, contact_email, contact_phone, address, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating client:', err);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

router.put('/:id', authenticateToken, authorizeRole('admin', 'staff'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact_name, contact_email, contact_phone, address, notes } = req.body;

    const result = await pool.query(
      `UPDATE clients 
       SET name = COALESCE($1, name),
           contact_name = COALESCE($2, contact_name),
           contact_email = COALESCE($3, contact_email),
           contact_phone = COALESCE($4, contact_phone),
           address = COALESCE($5, address),
           notes = COALESCE($6, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING *`,
      [name, contact_name, contact_email, contact_phone, address, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating client:', err);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM clients WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({ message: 'Client deleted successfully' });
  } catch (err) {
    console.error('Error deleting client:', err);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

module.exports = router;
