const pool = require('../config/db');
require('dotenv').config();

async function runMigration() {
  const client = await pool.connect();
  try {

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) NOT NULL,
        email VARCHAR(50) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role VARCHAR(10) NOT NULL CHECK (role IN ('boss', 'manager')),
        is_active BOOLEAN DEFAULT TRUE,
        token_version INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
        client_name VARCHAR(50) NOT NULL,
        client_phone VARCHAR(15),
        amount NUMERIC(14, 2) NOT NULL,
        note VARCHAR(20),
        short_desc VARCHAR(200),
        report_date DATE NOT NULL,
        last_edited_by UUID REFERENCES users(id) ON DELETE SET NULL,
        edited_by_ids UUID[] DEFAULT '{}',
        is_green BOOLEAN DEFAULT TRUE,
        next_report_date DATE,
        client_business_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);


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


    await client.query(`
      ALTER TABLE report_images ADD COLUMN IF NOT EXISTS caption VARCHAR(200);
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS client_phone VARCHAR(15);
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS edited_by_ids UUID[] DEFAULT '{}';
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS is_green BOOLEAN DEFAULT TRUE;
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS next_report_date DATE;
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS client_business_name VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 1;

      -- Drop old ON DELETE CASCADE constraint if it exists, and recreate with ON DELETE SET NULL
      ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_manager_id_fkey;
      ALTER TABLE reports ADD CONSTRAINT reports_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;
    `);


    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        user_name VARCHAR(50),
        user_role VARCHAR(10),
        action VARCHAR(50) NOT NULL,
        entity_type VARCHAR(30),
        entity_id UUID,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);



  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = runMigration;
