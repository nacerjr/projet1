import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Tournament {
  id?: string;
  name: string;
  date?: string;
  size: number;
  format: string;
  bracket: any[];
  winner?: string;
  // NOTE: runner_up does NOT exist on tournaments table — only on historical_tournaments
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Player {
  id?: string;
  name: string;
  trophies: number;
  second_place: number;
  created_at?: string;
  updated_at?: string;
}

export interface Settings {
  id?: number;
  key: string;
  value: any;
  created_at?: string;
  updated_at?: string;
}

// Tournament operations
export async function getTournaments() {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching tournaments:', error);
    return [];
  }
  return data || [];
}

export async function getActiveTournament() {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('is_active', true)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching active tournament:', error);
  }
  return data || null;
}

export async function createTournament(tournament: Tournament) {
  const { data, error } = await supabase
    .from('tournaments')
    .insert([tournament])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating tournament:', error);
    throw error;
  }
  return data;
}

export async function updateTournament(id: string, updates: Partial<Tournament>) {
  // Remove runner_up from updates — that column doesn't exist on tournaments table
  const { runner_up, ...safeUpdates } = updates as any;
  
  const { data, error } = await supabase
    .from('tournaments')
    .update(safeUpdates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating tournament:', error);
    throw error;
  }
  return data;
}

export async function deleteTournament(id: string) {
  const { error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting tournament:', error);
    throw error;
  }
}

export async function saveTournamentToHistory(tournament: Tournament & { runner_up?: string }) {
  const { data, error } = await supabase
    .from('historical_tournaments')
    .insert([{
      tournament_id: tournament.id,
      name: tournament.name,
      date: tournament.date,
      size: tournament.size,
      format: tournament.format,
      bracket: tournament.bracket,
      winner: tournament.winner,
      runner_up: tournament.runner_up ?? null,
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Error saving tournament to history:', error);
    throw error;
  }
  return data;
}

// Player operations
export async function getPlayers() {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('trophies', { ascending: false });
  
  if (error) {
    console.error('Error fetching players:', error);
    return [];
  }
  return data || [];
}

export async function getPlayer(name: string) {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('name', name)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching player:', error);
  }
  return data || null;
}

export async function createPlayer(player: Player) {
  const { data, error } = await supabase
    .from('players')
    .insert([player])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating player:', error);
    throw error;
  }
  return data;
}

export async function updatePlayer(id: string, updates: Partial<Player>) {
  const { data, error } = await supabase
    .from('players')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating player:', error);
    throw error;
  }
  return data;
}

export async function upsertPlayer(player: Player) {
  const existing = await getPlayer(player.name);
  
  if (existing) {
    return updatePlayer(existing.id, player);
  } else {
    return createPlayer(player);
  }
}

// Settings operations
export async function getSetting(key: string) {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching setting:', error);
  }
  return data?.value || null;
}

export async function setSetting(key: string, value: any) {
  const { data, error } = await supabase
    .from('settings')
    .upsert({ key, value }, { onConflict: 'key' })
    .select()
    .single();
  
  if (error) {
    console.error('Error setting configuration:', error);
    throw error;
  }
  return data;
}

// Nuclear reset — deletes ALL data
export async function resetAllData() {
  const errors: string[] = [];

  // Delete all historical tournaments
  const { error: e1 } = await supabase
    .from('historical_tournaments')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (e1) errors.push('historical_tournaments: ' + e1.message);

  // Delete all tournaments
  const { error: e2 } = await supabase
    .from('tournaments')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (e2) errors.push('tournaments: ' + e2.message);

  // Delete all players
  const { error: e3 } = await supabase
    .from('players')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (e3) errors.push('players: ' + e3.message);

  // Delete all settings
  const { error: e4 } = await supabase
    .from('settings')
    .delete()
    .neq('id', 0);
  if (e4) errors.push('settings: ' + e4.message);

  if (errors.length > 0) {
    throw new Error('Reset errors: ' + errors.join(' | '));
  }
}