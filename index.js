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
  '1 塩', '2 味の素', '3 醤油', '4 砂糖', '5 酢', '6 みりん', '7 ごま油', '8 ラー油', '9 にんにく', '10 しょうが',
  '11 ねぎ', '12 唐辛子', '13 こしょう', '14 酒', '15 昆布', '16 かつお節', '17 味噌', '18 はちみつ', '19 レモン汁', '20 オリーブオイル',
  '21 バター', '22 マヨネーズ', '23 ケチャップ', '24 ソース', '25 カレー粉', '26 ターメリック', '27 クミン', '28 ナツメグ', '29 シナモン', '30 クローブ',
  '31 バジル', '32 オレガノ', '33 ローズマリー', '34 タイム', '35 セージ', '36 パセリ', '37 コリアンダー', '38 フェンネル', '39 カイエンペッパー', '40 パプリカ',
  '41 黒酢', '42 白だし', '43 鶏ガラスープの素', '44 ホワイトペッパー', '45 しょうゆ麹', '46 みそ麹', '47 昆布茶', '48 鰹だし', '49 豆板醤', '50 甜麺醤',
  '51 サラダ油', '52 キャノーラ油', '53 ごま', '54 ピーナッツ', '55 アーモンド', '56 クルミ', '57 ココナッツミルク', '58 牛乳', '59 生クリーム', '60 ヨーグルト',
  '61 チーズ', '62 トマトペースト', '63 マスタード', '64 ワサビ', '65 タバスコ', '66 バルサミコ酢', '67 メープルシロップ', '68 ココアパウダー', '69 チリパウダー', '70 ガラムマサラ',
  '71 白ごま', '72 黒ごま', '73 あおさ', '74 海苔', '75 わさび漬け', '76 梅干し', '77 かぼす', '78 ゆず胡椒', '79 山椒', '80 七味唐辛子',
  '81 クレイジーソルト', '82 ジンジャーパウダー', '83 ガーリックパウダー', '84 オニオンパウダー', '85 セロリシード', '86 レッドペッパー', '87 バニラエッセンス', '88 チキンブイヨン', '89 ビネガー', '90 レッドワイン',
  '91 白ワイン', '92 みつば', '93 しそ', '94 しょうが汁', '95 にんにくチップ', '96 コショウ', '97 塩麹', '98 酢味噌', '99 砂糖漬けのレモン'
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
