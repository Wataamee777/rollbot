import 'dotenv/config';
import {
  Client, GatewayIntentBits, Partials, EmbedBuilder,
  REST, Routes, SlashCommandBuilder
} from 'discord.js';
import express from 'express';
import fs from 'fs';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// 環境変数
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const ALLOWED_CHANNEL_ID = process.env.ALLOWED_CHANNEL_ID;
const RARE_ROLE_ID = process.env.RARE_ROLE_ID;
const ADMIN_ID = process.env.ADMIN_ID || '1099098129338466385';
const BLUE_HIGANBANA_ROLE_ID = process.env.BLUE_HIGANBANA_ROLE_ID;
const PINK_HIGANBANA_ROLE_ID = process.env.PINK_HIGANBANA_ROLE_ID;
const PORT = process.env.PORT || 3000;

// 花データ読み込み
const flowers = JSON.parse(fs.readFileSync('./flowers_with_rarity.json', 'utf-8'));

// Expressサーバー（Render対応）
const app = express();
app.get('/', (_, res) => res.send('Hello World!'));
app.listen(PORT, () => console.log(`🌐 Webサーバー起動 ポート: ${PORT}`));

// SQLite DB準備
const db = await open({
  filename: './db.sqlite',
  driver: sqlite3.Database
});
await db.exec(`
  CREATE TABLE IF NOT EXISTS user_flowers (
    userId TEXT,
    flowerId INTEGER,
    UNIQUE(userId, flowerId)
  );
  CREATE TABLE IF NOT EXISTS user_xp (
    userId TEXT PRIMARY KEY,
    xp INTEGER DEFAULT 0
  );
`);

// Discord Botクライアント
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

// スラッシュコマンド登録
const commands = [
  new SlashCommandBuilder().setName('status').setDescription('自分のガチャ状況を確認'),
  new SlashCommandBuilder().setName('resetdb').setDescription('（管理者専用）DBを全リセットする')
];
const rest = new REST({ version: '10' }).setToken(TOKEN);
await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

// ガチャロジック
function gacha() {
  const rand = Math.random() * 100;
  let sum = 0;
  for (const flower of flowers) {
    sum += flower.prob;
    if (rand <= sum) return flower;
  }
  return flowers[flowers.length - 1]; // fallback
}

// スラッシュコマンド処理
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const userId = interaction.user.id;

  if (interaction.commandName === 'status') {
    const rows = await db.all('SELECT flowerId FROM user_flowers WHERE userId = ?', userId);
    const owned = rows.map(r => r.flowerId);
    const total = flowers.length;
    const percent = ((owned.length / total) * 100).toFixed(2);
    const xpRow = await db.get('SELECT xp FROM user_xp WHERE userId = ?', userId);
    const xp = xpRow?.xp || 0;

    const embed = new EmbedBuilder()
      .setTitle(`${interaction.user.username} のガチャ状況`)
      .setDescription(`🌸 所持数: ${owned.length} / ${total}（${percent}%）\n🎖️ XP: ${xp}`)
      .setColor(0x77ccff);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (interaction.commandName === 'resetdb') {
    if (userId !== ADMIN_ID) {
      return interaction.reply({ content: '🚫 権限がありません。', ephemeral: true });
    }
    await db.exec('DELETE FROM user_flowers; DELETE FROM user_xp;');
    await interaction.reply('✅ データベースを初期化しました。');
  }
});

// 花ガチャメッセージ反応
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (message.channel.id !== ALLOWED_CHANNEL_ID) return;
  if (!message.content.includes('花ガチャ')) return;

  const flower = gacha();
  const userId = message.author.id;

  try {
    await db.run('INSERT OR IGNORE INTO user_flowers (userId, flowerId) VALUES (?, ?)', userId, flower.id);
  } catch (e) {
    console.error('DBエラー:', e);
  }

  // XP加算ロジック
  const xpMap = {
    rare: 50,
    epic: 100,
    legend: 300,
    extramythic: 1000,
    extrasupermythic: 2000
  };
  const gainedXp = xpMap[flower.rarity] || 0;

  if (gainedXp > 0) {
    await db.run(`
      INSERT INTO user_xp (userId, xp)
      VALUES (?, ?)
      ON CONFLICT(userId) DO UPDATE SET xp = xp + ?
    `, userId, gainedXp, gainedXp);
  }

  // 埋め込み送信
  const embed = new EmbedBuilder()
    .setTitle('🌸 花ガチャ 結果！')
    .setDescription(`${message.author} が引いた花：**${flower.name}**\nレアリティ：\`${flower.rarity}\`` +
                    (gainedXp > 0 ? `\n🎖️ 獲得XP：\`${gainedXp}\`` : ''))
    .setColor(0xffc0cb)
    .setTimestamp();

  await message.reply({ embeds: [embed] });

  // 彼岸花ロール自動付与
  if (flower.rarity === 'extrasupermythic') {
    const member = await message.guild.members.fetch(userId);

    if (flower.id === 433 && BLUE_HIGANBANA_ROLE_ID && !member.roles.cache.has(BLUE_HIGANBANA_ROLE_ID)) {
      await member.roles.add(BLUE_HIGANBANA_ROLE_ID).catch(console.error);
      await message.channel.send(`🔵 ${message.author} に **青の彼岸花** ロールを付与しました！`);
    }

    if (flower.id === 434 && PINK_HIGANBANA_ROLE_ID && !member.roles.cache.has(PINK_HIGANBANA_ROLE_ID)) {
      await member.roles.add(PINK_HIGANBANA_ROLE_ID).catch(console.error);
      await message.channel.send(`🌸 ${message.author} に **ピンクの彼岸花** ロールを付与しました！`);
    }
  }
});

client.login(TOKEN);
