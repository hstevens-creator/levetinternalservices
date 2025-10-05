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

    await client.query('COMMIT');
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
