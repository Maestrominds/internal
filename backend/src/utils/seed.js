const pool = require('../config/db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seedBoss() {
  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [process.env.BOSS_EMAIL]
    );

    if (existing.rows.length > 0) {
      console.log('ℹ️  Boss already exists in DB, skipping seed.');
      return;
    }

    const hashedPassword = await bcrypt.hash(process.env.BOSS_PASSWORD, 12);

    await pool.query(
      `INSERT INTO users (name, email, password, role, is_active)
       VALUES ($1, $2, $3, 'boss', true)`,
      [process.env.BOSS_NAME, process.env.BOSS_EMAIL, hashedPassword]
    );

    console.log('✅ Boss seeded successfully!');
    console.log(`   Email: ${process.env.BOSS_EMAIL}`);
    console.log(`   Password: ${process.env.BOSS_PASSWORD}`);
  } catch (err) {
    console.error('❌ Boss seed failed:', err);
    throw err;
  }
}

module.exports = seedBoss;
