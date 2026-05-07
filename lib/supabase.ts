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
  const { data, error } = await supabase
    .from('tournaments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating tournament:', error);
    throw error;
  }
  return data;
}

export async function saveTournamentToHistory(tournament: Tournament) {
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
  // Try to get existing player
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
