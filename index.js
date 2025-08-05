import express from 'express';
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import { Pool } from 'pg';
import fs from 'fs/promises';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Discordクライアント準備
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

let ingredients = [];

// PostgreSQLプール作成
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// DB初期化
async function initDB() {
  const query = `
    CREATE TABLE IF NOT EXISTS user_gacha (
      user_id TEXT NOT NULL,
      item TEXT NOT NULL,
      PRIMARY KEY(user_id, item)
    )
  `;
  await pool.query(query);
}

// 食材リスト読み込み
async function loadIngredients() {
  const data = await fs.readFile('./ingredients.json', 'utf8');
  ingredients = JSON.parse(data);
}

// Expressルート：Hello World返すだけ
app.get('/', (req, res) => {
  res.send('Hello World');
});

client.once('ready', async () => {
  await loadIngredients();
  await initDB();
  console.log(`Logged in as ${client.user.tag}, loaded ${ingredients.length} items.`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.includes('料理ガチャ')) return;

  const choice = ingredients[Math.floor(Math.random() * ingredients.length)];

  try {
    await pool.query(
      'INSERT INTO user_gacha (user_id, item) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [message.author.id, choice]
    );
  } catch (err) {
    console.error('DB error:', err);
  }

  let count = 0;
  try {
    const res = await pool.query('SELECT COUNT(*) FROM user_gacha WHERE user_id = $1', [message.author.id]);
    count = parseInt(res.rows[0].count, 10);
  } catch (err) {
    console.error('DB count error:', err);
  }

  const embed = new EmbedBuilder()
    .setTitle('🎲 料理ガチャ結果 🎲')
    .setDescription(`【食材】${choice}\n${message.author}\nあなたの所持数: ${count} 個`)
    .setColor(0xffcc00);

  await message.channel.send({ embeds: [embed] });
});

// Expressサーバー起動
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});

// Discordログイン
client.login(process.env.DISCORD_TOKEN);
