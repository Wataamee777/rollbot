import express from 'express';
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// Expressのルート設定
app.get('/', (req, res) => {
  res.send('<h1>Hello World</h1>');
});

// Discord botのイベント
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.content.includes('料理ガチャ')) {
    const ingredients = [
  '塩', '味の素', '醤油', '砂糖', '酢', 'みりん', 'ごま油', 'ラー油', 'にんにく', 'しょうが',
  'ねぎ', '唐辛子', 'こしょう', '酒', '昆布', 'かつお節', '味噌', 'はちみつ', 'レモン汁', 'オリーブオイル',
  'バター', 'マヨネーズ', 'ケチャップ', 'ソース', 'カレー粉', 'ターメリック', 'クミン', 'ナツメグ', 'シナモン', 'クローブ',
  'バジル', 'オレガノ', 'ローズマリー', 'タイム', 'セージ', 'パセリ', 'コリアンダー', 'フェンネル', 'カイエンペッパー', 'パプリカ',
  '黒酢', '白だし', '鶏ガラスープの素', 'ホワイトペッパー', 'しょうゆ麹', 'みそ麹', '昆布茶', '鰹だし', '豆板醤', '甜麺醤',
  'サラダ油', 'キャノーラ油', 'ごま', 'ピーナッツ', 'アーモンド', 'クルミ', 'ココナッツミルク', '牛乳', '生クリーム', 'ヨーグルト',
  'チーズ', 'トマトペースト', 'マスタード', 'ワサビ', 'タバスコ', 'バルサミコ酢', 'メープルシロップ', 'ココアパウダー', 'チリパウダー', 'ガラムマサラ',
  '白ごま', '黒ごま', 'あおさ', '海苔', 'わさび漬け', '梅干し', 'かぼす', 'ゆず胡椒', '山椒', '七味唐辛子',
  'クレイジーソルト', 'ジンジャーパウダー', 'ガーリックパウダー', 'オニオンパウダー', 'セロリシード', 'レッドペッパー', 'バニラエッセンス', 'チキンブイヨン', 'ビネガー', 'レッドワイン',
  '白ワイン', 'みつば', 'しそ', 'みつば', 'しょうが汁', 'にんにくチップ', 'コショウ', '塩麹', '酢味噌', '砂糖漬けのレモン' // ... 必要に応じて100個以上
    ];
    const choice = ingredients[Math.floor(Math.random() * ingredients.length)];

    const embed = new EmbedBuilder()
      .setTitle('🎲 料理ガチャ結果 🎲')
      .setDescription(`【食材】${choice}\n${message.author}`)
      .setColor(0xffcc00);

    await message.channel.send({ embeds: [embed] });
  }
});

// サーバー起動とDiscordログイン
app.listen(PORT, () => {
  console.log(`Express server running at http://localhost:${PORT}`);
});

client.login(process.env.DISCORD_TOKEN);
