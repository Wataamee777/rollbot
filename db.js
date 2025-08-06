import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function insertFlower(userId, flowerId) {
  // ユーザーがすでに持ってるかチェック
  const { data: existing } = await supabase
    .from('user_flowers')
    .select('*')
    .eq('userId', userId)
    .eq('flowerId', flowerId);

  if (existing && existing.length > 0) return; // すでに持ってたら何もしない

  await supabase
    .from('user_flowers')
    .insert([{ userId, flowerId }]);
}

export async function addXp(userId, xpToAdd) {
  const { data, error } = await supabase
    .from('user_xp')
    .select('xp')
    .eq('userId', userId)
    .single();

  if (error && error.code === 'PGRST116') { // レコード無し
    await supabase.from('user_xp').insert({ userId, xp: xpToAdd });
  } else if (data) {
    await supabase
      .from('user_xp')
      .update({ xp: data.xp + xpToAdd })
      .eq('userId', userId);
  }
}

export async function getStatus(userId) {
  const { data: flowers } = await supabase
    .from('user_flowers')
    .select('flowerId')
    .eq('userId', userId);

  const { data: xpData } = await supabase
    .from('user_xp')
    .select('xp')
    .eq('userId', userId)
    .single();

  return { flowerIds: flowers?.map(f => f.flowerId) || [], xp: xpData?.xp || 0 };
}

export async function resetDb() {
  // Supabase SQLでテーブル初期化する場合、SQL文を書いて実行するAPIを呼ぶか、
  // 手動でトリガーする形になる。
  // 簡単にはテーブルの行を全部削除するだけなら以下でOK:
  await supabase.from('user_flowers').delete().neq('userId', '');
  await supabase.from('user_xp').delete().neq('userId', '');
}
