import { Client, GatewayIntentBits, Partials, EmbedBuilder } from 'discord.js';
import express from 'express';
import fs from 'fs';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const TOKEN = 'YOUR_DISCORD_BOT_TOKEN';
const GUILD_ID = 'YOUR_GUILD_ID';
const ALLOWED_CHANNEL_ID = 'YOUR_CHANNEL_ID'; // 花ガチャを許可するチャンネルID
const RARE_ROLE_ID = 'YOUR_RARE_ROLE_ID'; // 激レア報酬ロールID

// flower JSON
const flowers = JSON.parse(fs.readFileSync('./flowers_with_rarity.json', 'utf-8'));

// Express
const app = express();
app.get('/', (_, res) => res.send('Hello World!'));
app.listen(process.env.PORT || 3000, () => console.log('🌐 Webサーバー起動'));

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

// 🎰 ガチャ関数
function gacha() {
  const rand = Math.random() * 100;
  let sum = 0;
  for (const flower of flowers) {
    sum += flower.prob;
    if (rand <= sum) return flower;
  }
  return flowers[flowers.length - 1]; // fallback
}

// 🌸 status確認コマンド
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'status') {
    const userId = interaction.user.id;
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
});

// 📝 「花ガチャ」メッセージに反応
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

  // 埋め込み返信
  const embed = new EmbedBuilder()
    .setTitle('🌸 花ガチャ 結果！')
    .setDescription(`${message.author} が引いた花：**${flower.name}**\nレアリティ：\`${flower.rarity}\``)
    .setColor(0xffc0cb)
    .setTimestamp();

  await message.reply({ embeds: [embed] });

  // 激レアならロール付与
  if (['extrasupermythic'].includes(flower.rarity)) {
    const member = await message.guild.members.fetch(message.author.id);
    if (!member.roles.cache.has(RARE_ROLE_ID)) {
      await member.roles.add(RARE_ROLE_ID).catch(console.error);
      await message.channel.send(`🎉 ${message.author} に特別ロールを付与しました！`);
    }
  }
});

client.login(TOKEN);
