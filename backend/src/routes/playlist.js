const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { assignCampaignsToSlots, getScreenPlaylist } = require('../services/playlistManager');

const router = express.Router();

router.get('/screen/:screenId', async (req, res) => {
  try {
    const { screenId } = req.params;
    const { player_key } = req.query;

    if (player_key) {
      const screen = await pool.query(
        'SELECT * FROM screens WHERE id = $1 AND player_key = $2',
        [screenId, player_key]
      );

      if (screen.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid screen credentials' });
      }
    } else {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const playlist = await getScreenPlaylist(screenId);
    res.json(playlist);
  } catch (err) {
    console.error('Error fetching playlist:', err);
    res.status(500).json({ error: 'Failed to fetch playlist' });
  }
});

router.post('/screen/:screenId/refresh', authenticateToken, authorizeRole('admin', 'staff'), async (req, res) => {
  try {
    const { screenId } = req.params;
    const slots = await assignCampaignsToSlots(parseInt(screenId));
    
    const io = req.app.get('io');
    if (io) {
      io.to(`screen-${screenId}`).emit('playlist:update', slots);
    }
    
    res.json({ success: true, slots });
  } catch (err) {
    console.error('Error refreshing playlist:', err);
    res.status(500).json({ error: 'Failed to refresh playlist' });
  }
});

router.put('/screen/:screenId/slot/:slotNumber', authenticateToken, authorizeRole('admin', 'staff'), async (req, res) => {
  try {
    const { screenId, slotNumber } = req.params;
    const { campaignId } = req.body;

    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign ID is required' });
    }

    await pool.query(`
      INSERT INTO playlist_slots (screen_id, slot_number, campaign_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (screen_id, slot_number) 
      DO UPDATE SET campaign_id = $3, updated_at = CURRENT_TIMESTAMP
    `, [screenId, slotNumber, campaignId]);

    const playlist = await getScreenPlaylist(screenId);
    
    const io = req.app.get('io');
    if (io) {
      io.to(`screen-${screenId}`).emit('playlist:update', playlist);
    }

    res.json({ success: true, playlist });
  } catch (err) {
    console.error('Error updating slot:', err);
    res.status(500).json({ error: 'Failed to update slot' });
  }
});

module.exports = router;
