import 'dotenv/config';
import {
  Client, GatewayIntentBits, Partials, EmbedBuilder,
  REST, Routes, SlashCommandBuilder
} from 'discord.js';
import express from 'express';
import fs from 'fs';
import {
  insertFlower, addXp, getStatus, resetDb
} from './db.js';

// 🌱 環境変数
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const ALLOWED_CHANNEL_ID = process.env.ALLOWED_CHANNEL_ID;
const ADMIN_ID = process.env.ADMIN_ID || '1099098129338466385';
const BLUE_HIGANBANA_ROLE_ID = process.env.BLUE_HIGANBANA_ROLE_ID;
const PINK_HIGANBANA_ROLE_ID = process.env.PINK_HIGANBANA_ROLE_ID;
const PORT = process.env.PORT || 3000;

// 🕒 レート制限
const cooldowns = new Map();

// 🌸 花データ読み込み
const flowers = JSON.parse(fs.readFileSync('./flowers_with_rarity.json', 'utf-8'));

// 🌐 Webサーバー（Render用）
const app = express();
app.get('/', (_, res) => res.send('Hello World!'));
app.listen(PORT, () => console.log(`🌐 Webサーバー起動 ポート: ${PORT}`));

// 💬 Discord Botクライアント
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

// 🛠️ スラッシュコマンド登録
const commands = [
  new SlashCommandBuilder().setName('status').setDescription('自分のガチャ状況を確認'),
  new SlashCommandBuilder().setName('resetdb').setDescription('（管理者専用）DBを全リセットする'),
  new SlashCommandBuilder().setName('list').setDescription('まだ持ってない花を一覧表示')
];
const rest = new REST({ version: '10' }).setToken(TOKEN);
await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

// 🎰 ガチャロジック
function gacha() {
  const rand = Math.random() * 100;
  let sum = 0;
  for (const flower of flowers) {
    sum += flower.prob;
    if (rand <= sum) return flower;
  }
  return flowers[flowers.length - 1];
}

// 🧾 スラッシュコマンド処理
client.on('interactionCreate', async interaction => {
  if (interaction.commandName === 'list') {
  const { flowerIds } = await getStatus(interaction.user.id); // flowerIdsは配列
  const listText = flowerIds.sort((a,b) => a - b).join(', '); // IDだけ

  const embed = new EmbedBuilder()
    .setTitle(`${interaction.user.username} の所持花ID一覧`)
    .setDescription(listText || '🌱 まだ花を持ってません')
    .setColor(0x77ccff);

  await interaction.reply({ embeds: [embed]});
}


  const description = missingFlowers
    .map(f => `🌸 **${f.name}** （${f.rarity}）`)
    .join('\n');

  const embed = new EmbedBuilder()
    .setTitle(`${interaction.user.username} がまだ持ってない花`)
    .setDescription(description)
    .setColor(0xff9999);

  await interaction.reply({
    embeds: [embed]
  });

  if (!interaction.isChatInputCommand()) return;
  const userId = interaction.user.id;

  if (interaction.commandName === 'status') {
    const { flowerIds, xp } = await getStatus(userId);
    const total = flowers.length;
    const percent = ((flowerIds.length / total) * 100).toFixed(2);
  }
  if (interaction.commandName === 'resetdb') {
    if (userId !== ADMIN_ID) {
      return interaction.reply({ content: '🚫 権限がありません。', ephemeral: true });
    }
    await resetDb();
    await interaction.reply('✅ Supabase上のデータベースを初期化しました。');
  }
});

// 💥 花ガチャ処理（キーワード反応）
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (message.channel.id !== ALLOWED_CHANNEL_ID) return;
  if (!message.content.includes('花ガチャ')) return;

  const userId = message.author.id;
  const now = Date.now();
  const cooldownAmount = 30 * 1000;

  if (cooldowns.has(userId)) {
    const expirationTime = cooldowns.get(userId) + cooldownAmount;
    if (now < expirationTime) {
      const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
      return message.reply(`⌛ ガチャはあと ${timeLeft} 秒後に引けるよ！`);
    }
  }
  cooldowns.set(userId, now);
  setTimeout(() => cooldowns.delete(userId), cooldownAmount);

  const flower = gacha();
  await insertFlower(userId, flower.id);

  const xpMap = {
    rare: 10,
    epic: 30,
    legend: 50,
    extramythic: 100,
    extrasupermythic: 2000
  };
  const gainedXp = xpMap[flower.rarity] || 0;

  if (gainedXp > 0) {
    await addXp(userId, gainedXp);
  }

  const embed = new EmbedBuilder()
    .setTitle('🌸 花ガチャ 結果！')
    .setDescription(`${message.author} が引いた花：番号:${flower.id} **${flower.name}**\nレアリティ：\`${flower.rarity}\`` +
                    (gainedXp > 0 ? `\n🎖️ 獲得XP：\`${gainedXp}\`` : ''))
    .setColor(0xffc0cb)
    .setTimestamp();

  await message.reply({ embeds: [embed] });

  // ロール付与処理
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
  // 花ガチャ処理の後（insertFlowerとかXP加算終わったあと）

const { flowerIds } = await getStatus(userId);
const totalFlowers = flowers.length;

if (flowerIds.length === totalFlowers) {
  await message.channel.send(`🎉 おめでとう!! 全クリだよ！ 🎉`);
}
});

client.login(TOKEN);
