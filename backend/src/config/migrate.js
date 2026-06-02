const pool = require('../config/db');
require('dotenv').config();

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running database migration...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) NOT NULL,
        email VARCHAR(50) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role VARCHAR(10) NOT NULL CHECK (role IN ('boss', 'manager')),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ users table ready');

    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        manager_id UUID REFERENCES users(id) ON DELETE CASCADE,
        client_name VARCHAR(50) NOT NULL,
        amount NUMERIC(14, 2) NOT NULL,
        note VARCHAR(20),
        short_desc VARCHAR(200),
        report_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ reports table ready');

    await client.query(`
      CREATE TABLE IF NOT EXISTS report_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
        cloudinary_url TEXT NOT NULL,
        cloudinary_id TEXT NOT NULL,
        caption VARCHAR(200),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ report_images table ready');

    await client.query(`
      ALTER TABLE report_images ADD COLUMN IF NOT EXISTS caption VARCHAR(200);
    `);
    console.log('✅ report_images caption column added/verified');

    console.log('✅ Migration complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = runMigration;
