const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const activeClientsResult = await pool.query(
      'SELECT COUNT(DISTINCT client_id) as count FROM placements WHERE status = $1',
      ['active']
    );

    const activePlacementsResult = await pool.query(
      'SELECT COUNT(*) as count FROM placements WHERE status = $1',
      ['active']
    );

    const onlineScreensResult = await pool.query(
      'SELECT COUNT(*) as count FROM screens WHERE online = true'
    );

    const totalScreensResult = await pool.query(
      'SELECT COUNT(*) as count FROM screens'
    );

    const monthlyRevenueResult = await pool.query(
      `SELECT COALESCE(SUM(price), 0) as total 
       FROM placements 
       WHERE status = 'active' 
       AND EXTRACT(MONTH FROM start_date) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM CURRENT_DATE)`
    );

    const upcomingExpirations = await pool.query(
      `SELECT p.*, c.name as client_name 
       FROM placements p 
       LEFT JOIN clients c ON p.client_id = c.id 
       WHERE p.status = 'active' 
       AND p.end_date <= CURRENT_DATE + INTERVAL '7 days' 
       ORDER BY p.end_date ASC 
       LIMIT 5`
    );

    res.json({
      activeClients: parseInt(activeClientsResult.rows[0].count),
      activePlacements: parseInt(activePlacementsResult.rows[0].count),
      onlineScreens: parseInt(onlineScreensResult.rows[0].count),
      totalScreens: parseInt(totalScreensResult.rows[0].count),
      monthlyRevenue: parseFloat(monthlyRevenueResult.rows[0].total),
      upcomingExpirations: upcomingExpirations.rows
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

module.exports = router;
