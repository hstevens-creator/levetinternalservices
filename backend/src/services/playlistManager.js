const { pool } = require('../config/database');

const generateWeightedPlaylist = (campaigns) => {
  if (!campaigns || campaigns.length === 0) return [];
  
  const weightedList = [];
  campaigns.forEach(campaign => {
    const weight = campaign.weight || 1;
    for (let i = 0; i < weight; i++) {
      weightedList.push(campaign);
    }
  });
  
  const shuffled = weightedList.sort(() => Math.random() - 0.5);
  return shuffled;
};

const assignCampaignsToSlots = async (screenId) => {
  try {
    const campaignsResult = await pool.query(`
      SELECT c.* FROM campaigns c
      INNER JOIN placements p ON c.placement_id = p.id
      WHERE p.screen_id = $1 
        AND c.active = true 
        AND p.status = 'active'
      ORDER BY c.weight DESC, c.created_at ASC
    `, [screenId]);

    const campaigns = campaignsResult.rows;
    
    if (campaigns.length === 0) {
      return [];
    }

    const weightedPlaylist = generateWeightedPlaylist(campaigns);
    
    const slots = [];
    for (let slotNumber = 1; slotNumber <= 6; slotNumber++) {
      const campaign = weightedPlaylist[(slotNumber - 1) % weightedPlaylist.length];
      
      await pool.query(`
        INSERT INTO playlist_slots (screen_id, slot_number, campaign_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (screen_id, slot_number) 
        DO UPDATE SET campaign_id = $3, updated_at = CURRENT_TIMESTAMP
      `, [screenId, slotNumber, campaign.id]);
      
      slots.push({
        slotNumber,
        campaign: {
          id: campaign.id,
          contentUrl: campaign.content_url,
          type: campaign.type,
          duration: campaign.duration || 10
        }
      });
    }
    
    return slots;
  } catch (err) {
    console.error('Error assigning campaigns to slots:', err);
    throw err;
  }
};

const getScreenPlaylist = async (screenId) => {
  try {
    const result = await pool.query(`
      SELECT 
        ps.slot_number,
        c.id as campaign_id,
        c.content_url,
        c.type,
        c.duration
      FROM playlist_slots ps
      INNER JOIN campaigns c ON ps.campaign_id = c.id
      WHERE ps.screen_id = $1 AND c.active = true
      ORDER BY ps.slot_number ASC
    `, [screenId]);

    return result.rows.map(row => ({
      slotNumber: row.slot_number,
      campaignId: row.campaign_id,
      contentUrl: row.content_url,
      type: row.type,
      duration: row.duration || 10
    }));
  } catch (err) {
    console.error('Error getting screen playlist:', err);
    throw err;
  }
};

const refreshAllScreenPlaylists = async () => {
  try {
    const screensResult = await pool.query('SELECT id FROM screens WHERE online = true');
    
    for (const screen of screensResult.rows) {
      await assignCampaignsToSlots(screen.id);
    }
    
    console.log(`Refreshed playlists for ${screensResult.rows.length} screens`);
  } catch (err) {
    console.error('Error refreshing all screen playlists:', err);
  }
};

module.exports = {
  assignCampaignsToSlots,
  getScreenPlaylist,
  refreshAllScreenPlaylists,
  generateWeightedPlaylist
};
