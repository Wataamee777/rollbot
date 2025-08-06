import 'dotenv/config'; // env読み込み

import { Client, GatewayIntentBits, Partials, EmbedBuilder, REST, Routes, SlashCommandBuilder } from 'discord.js';
import express from 'express';
import fs from 'fs';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const ALLOWED_CHANNEL_ID = process.env.ALLOWED_CHANNEL_ID;
const RARE_ROLE_ID = process.env.RARE_ROLE_ID;
const ADMIN_ID = process.env.ADMIN_ID || '1099098129338466385';
const PORT = process.env.PORT || 3000;

const flowers = JSON.parse(fs.readFileSync('./flowers_with_rarity.json', 'utf-8'));

// Express
const app = express();
app.get('/', (_, res) => res.send('Hello World!'));
app.listen(PORT, () => console.log(`🌐 Webサーバー起動 ポート: ${PORT}`));

// DB
const db = await open({
  filename: './db.sqlite',
  driver: sqlite3.Database
});
await db.exec(`CREATE TABLE IF NOT EXISTS user_flowers (
  userId TEXT,
  flowerId INTEGER,
  UNIQUE(userId, flowerId)
)`);

// Bot
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

// ガチャ関数
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
    const embed = new EmbedBuilder()
      .setTitle(`${interaction.user.username}のガチャ状況`)
      .setDescription(`所持数: ${owned.length} / ${total}（${percent}%）`)
      .setColor(0x77ccff);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (interaction.commandName === 'resetdb') {
    if (userId !== ADMIN_ID) {
      return interaction.reply({ content: '🚫 あなたにはこの操作の権限がありません。', ephemeral: true });
    }
    await db.exec('DELETE FROM user_flowers');
    await interaction.reply('💥 データベースを初期化しました（全ユーザーの花情報を削除）');
  }
});

// 花ガチャメッセージに反応
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (message.channel.id !== ALLOWED_CHANNEL_ID) return;
  if (!message.content.includes('花ガチャ')) return;

  const flower = gacha();

  // 保存
  try {
    await db.run('INSERT OR IGNORE INTO user_flowers (userId, flowerId) VALUES (?, ?)', message.author.id, flower.id);
  } catch (e) {
    console.error('DBエラー:', e);
  }

  // 埋め込み
  const embed = new EmbedBuilder()
    .setTitle('🌸 花ガチャ 結果！')
    .setDescription(`${message.author} が引いた花：**${flower.name}**\nレアリティ：\`${flower.rarity}\``)
    .setColor(0xffc0cb)
    .setTimestamp();

  await message.reply({ embeds: [embed] });

  // 激レアロール
  if (flower.rarity === 'extrasupermythic') {
    const member = await message.guild.members.fetch(message.author.id);
    if (!member.roles.cache.has(RARE_ROLE_ID)) {
      await member.roles.add(RARE_ROLE_ID).catch(console.error);
      await message.channel.send(`🎉 ${message.author} に特別ロールを付与しました！`);
    }
  }
});

client.login(TOKEN);
