const bcrypt = require('bcrypt');
const { pool } = require('./config/database');

async function seed() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const adminPassword = await bcrypt.hash('admin123', 10);
    await client.query(
      `INSERT INTO users (name, email, password_hash, role) 
       VALUES ('Admin User', 'admin@levet.com', $1, 'admin')
       ON CONFLICT (email) DO NOTHING`,
      [adminPassword]
    );

    const staffPassword = await bcrypt.hash('staff123', 10);
    await client.query(
      `INSERT INTO users (name, email, password_hash, role) 
       VALUES ('Staff User', 'staff@levet.com', $1, 'staff')
       ON CONFLICT (email) DO NOTHING`,
      [staffPassword]
    );

    await client.query(
      `INSERT INTO clients (name, contact_name, contact_email, contact_phone) 
       VALUES 
       ('ABC Corporation', 'John Smith', 'john@abc.com', '+44 20 1234 5678'),
       ('XYZ Ltd', 'Jane Doe', 'jane@xyz.com', '+44 20 8765 4321')
       ON CONFLICT DO NOTHING`
    );

    await client.query(
      `INSERT INTO screens (name, location, player_key) 
       VALUES 
       ('DigiBoard 001', 'London - Oxford Street', 'test-key-001'),
       ('DigiBoard 002', 'Manchester - City Center', 'test-key-002')
       ON CONFLICT (player_key) DO NOTHING`
    );

    const clientResult = await client.query('SELECT id FROM clients LIMIT 1');
    const screenResult = await client.query('SELECT id FROM screens LIMIT 1');
    
    if (clientResult.rows.length > 0 && screenResult.rows.length > 0) {
      const clientId = clientResult.rows[0].id;
      const screenId = screenResult.rows[0].id;
      
      const placementResult = await client.query(
        `INSERT INTO placements (placement_ref, format, client_id, screen_id, campaign_name, start_date, end_date, status, price)
         VALUES 
         ('PLC-001', 'DigiBoard', $1, $2, 'Summer Sale 2025', '2025-10-01', '2025-12-31', 'active', 500.00),
         ('PLC-002', 'DigiBoard', $1, $2, 'New Product Launch', '2025-10-01', '2025-12-31', 'active', 750.00),
         ('PLC-003', 'DigiBoard', $1, $2, 'Holiday Special', '2025-10-01', '2025-12-31', 'active', 600.00)
         ON CONFLICT (placement_ref) DO NOTHING
         RETURNING id`,
        [clientId, screenId]
      );

      if (placementResult.rows.length > 0) {
        const colors = ['ff6b6b', '4ecdc4', 'ffe66d'];
        let colorIndex = 0;
        
        for (const placement of placementResult.rows) {
          const color = colors[colorIndex % colors.length];
          const svg = `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg"><rect width="1920" height="1080" fill="#${color}"/><text x="50%" y="50%" text-anchor="middle" font-size="120" fill="white" font-family="Arial">Campaign ${placement.id}</text></svg>`;
          const base64 = Buffer.from(svg).toString('base64');
          const dataUrl = `data:image/svg+xml;base64,${base64}`;
          
          await client.query(
            `INSERT INTO campaigns (placement_id, content_url, type, duration, weight, active)
             VALUES ($1, $2, 'image', 10, $3, true)
             ON CONFLICT DO NOTHING`,
            [placement.id, dataUrl, Math.floor(Math.random() * 3) + 1]
          );
          
          colorIndex++;
        }
      }
    }

    const campaignsResult = await client.query('SELECT id FROM campaigns LIMIT 6');
    const screensResult = await client.query('SELECT id FROM screens');

    for (const screen of screensResult.rows) {
      for (let slotNumber = 1; slotNumber <= 6; slotNumber++) {
        const campaign = campaignsResult.rows[(slotNumber - 1) % campaignsResult.rows.length];
        if (campaign) {
          await client.query(
            `INSERT INTO playlist_slots (screen_id, slot_number, campaign_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (screen_id, slot_number) DO NOTHING`,
            [screen.id, slotNumber, campaign.id]
          );
        }
      }
    }

    await client.query('COMMIT');
    console.log('Playlist slots seeded');
    console.log('Seed data inserted successfully');
    console.log('\nDefault login credentials:');
    console.log('Admin: admin@levet.com / admin123');
    console.log('Staff: staff@levet.com / staff123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error seeding database:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
