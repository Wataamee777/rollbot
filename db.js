import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL || '', // 使わない場合は削除OK
  ssl: { rejectUnauthorized: false },
  user: 'postgres',
  password: 'not-needed-in-anon-key',
});

export async function insertFlower(userId, flowerId) {
  await pool.query(
    'INSERT INTO user_flowers (user_id, flower_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [userId, flowerId]
  );
}

export async function addXp(userId, amount) {
  await pool.query(`
    INSERT INTO user_xp (user_id, xp) VALUES ($1, $2)
    ON CONFLICT (user_id) DO UPDATE SET xp = user_xp.xp + $2
  `, [userId, amount]);
}

export async function getStatus(userId) {
  const flowers = await pool.query('SELECT flower_id FROM user_flowers WHERE user_id = $1', [userId]);
  const xp = await pool.query('SELECT xp FROM user_xp WHERE user_id = $1', [userId]);
  return { flowerIds: flowers.rows.map(r => r.flower_id), xp: xp.rows[0]?.xp || 0 };
}

export async function resetDb() {
  await pool.query('DELETE FROM user_flowers; DELETE FROM user_xp;');
}
