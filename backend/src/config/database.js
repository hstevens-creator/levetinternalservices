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
        screen_type VARCHAR(50) DEFAULT 'DigiBoard',
        offline_mode_enabled BOOLEAN DEFAULT true,
        debug_mode BOOLEAN DEFAULT false,
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
        recurring BOOLEAN DEFAULT false,
        recurring_interval VARCHAR(20),
        format VARCHAR(20) DEFAULT 'landscape',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        type VARCHAR(100) NOT NULL,
        payload JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS playlist_slots (
        id SERIAL PRIMARY KEY,
        screen_id INTEGER REFERENCES screens(id) ON DELETE CASCADE,
        slot_number INTEGER NOT NULL CHECK (slot_number >= 1 AND slot_number <= 6),
        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(screen_id, slot_number)
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        recipient_email VARCHAR(255),
        subject VARCHAR(255),
        message TEXT,
        sent BOOLEAN DEFAULT false,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER,
        old_values JSONB,
        new_values JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS client_portal_users (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS screen_cache (
        id SERIAL PRIMARY KEY,
        screen_id INTEGER REFERENCES screens(id) ON DELETE CASCADE,
        content_url TEXT NOT NULL,
        cached_data BYTEA,
        content_type VARCHAR(50),
        file_size INTEGER,
        cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_placements_status ON placements(status);
      CREATE INDEX IF NOT EXISTS idx_placements_dates ON placements(start_date, end_date);
      CREATE INDEX IF NOT EXISTS idx_screens_online ON screens(online);
      CREATE INDEX IF NOT EXISTS idx_campaigns_placement ON campaigns(placement_id);
      CREATE INDEX IF NOT EXISTS idx_playlist_slots_screen ON playlist_slots(screen_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_sent ON notifications(sent);
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
