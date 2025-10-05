const cron = require('node-cron');
const { pool } = require('../config/database');

const updatePlacementStatus = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];

    await pool.query(
      `UPDATE placements 
       SET status = 'active' 
       WHERE status = 'upcoming' 
       AND start_date <= $1`,
      [today]
    );

    await pool.query(
      `UPDATE placements 
       SET status = 'completed' 
       WHERE status = 'active' 
       AND end_date < $1`,
      [today]
    );

    await pool.query(
      `INSERT INTO events (type, payload) 
       VALUES ('placement_status_update', '{"timestamp": "${new Date().toISOString()}"}')`
    );

    console.log('Placement statuses updated');
  } catch (err) {
    console.error('Error updating placement statuses:', err);
  }
};

const checkOfflineScreens = async () => {
  try {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    await pool.query(
      `UPDATE screens 
       SET online = false 
       WHERE online = true 
       AND last_seen < $1`,
      [twoMinutesAgo]
    );

    console.log('Offline screens checked');
  } catch (err) {
    console.error('Error checking offline screens:', err);
  }
};

const startCronJobs = () => {
  cron.schedule('* * * * *', updatePlacementStatus);
  
  cron.schedule('* * * * *', checkOfflineScreens);
  
  console.log('Cron jobs started');
};

module.exports = { startCronJobs };
