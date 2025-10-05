const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

const initializeDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'viewer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact_name VARCHAR(255),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        address TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS screens (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        online BOOLEAN DEFAULT false,
        player_key VARCHAR(255) UNIQUE NOT NULL,
        last_seen TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS placements (
        id SERIAL PRIMARY KEY,
        placement_ref VARCHAR(100) UNIQUE NOT NULL,
        format VARCHAR(50) NOT NULL,
        client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
        screen_id INTEGER REFERENCES screens(id) ON DELETE SET NULL,
        campaign_name VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'upcoming',
        artwork_url TEXT,
        price DECIMAL(10, 2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS campaigns (
        id SERIAL PRIMARY KEY,
        placement_id INTEGER REFERENCES placements(id) ON DELETE CASCADE,
        content_url TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'video',
        duration INTEGER DEFAULT 10,
        weight INTEGER DEFAULT 1,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        type VARCHAR(100) NOT NULL,
        payload JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_placements_status ON placements(status);
      CREATE INDEX IF NOT EXISTS idx_placements_dates ON placements(start_date, end_date);
      CREATE INDEX IF NOT EXISTS idx_screens_online ON screens(online);
      CREATE INDEX IF NOT EXISTS idx_campaigns_placement ON campaigns(placement_id);
    `);
    
    console.log('Database schema initialized successfully');
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { pool, initializeDatabase };
