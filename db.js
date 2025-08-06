import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function insertFlower(userId, flowerId) {
  const { data: existing } = await supabase
    .from('user_flowers')
    .select('*')
    .eq('user_id', userId)
    .eq('flower_id', flowerId);

  if (existing && existing.length > 0) return;

  await supabase
    .from('user_flowers')
    .insert([{ user_id: userId, flower_id: flowerId }]);
}

export async function addXp(userId, xpToAdd) {
  const { data, error } = await supabase
    .from('user_xp')
    .select('xp')
    .eq('user_id', userId)
    .single();

  if (error && error.code === 'PGRST116') {
    await supabase.from('user_xp').insert({ user_id: userId, xp: xpToAdd });
  } else if (data) {
    await supabase
      .from('user_xp')
      .update({ xp: data.xp + xpToAdd })
      .eq('user_id', userId);
  }
}

export async function getStatus(userId) {
  const { data: flowers } = await supabase
    .from('user_flowers')
    .select('flower_id')
    .eq('user_id', userId);

  const { data: xpData } = await supabase
    .from('user_xp')
    .select('xp')
    .eq('user_id', userId)
    .single();

  return { flowerIds: flowers?.map(f => f.flower_id) || [], xp: xpData?.xp || 0 };
}

export async function resetDb() {
  await supabase.from('user_flowers').delete().neq('user_id', '');
  await supabase.from('user_xp').delete().neq('user_id', '');
}
