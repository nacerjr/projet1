// Database layer - Supabase as the ONLY data source (no localStorage)
import { supabase, createTournament, updateTournament, getActiveTournament, getTournaments, saveTournamentToHistory, getPlayers, getPlayer, createPlayer, updatePlayer, getSetting, setSetting } from './supabase';

export interface Tournament {
  id: string;
  name: string;
  date?: string;
  size: 8 | 16 | 32 | 64 | 128 | 256;
  format: 'Single Elimination' | 'Double Elimination' | 'Round Robin';
  bracket: Match[];
  winner?: string;
  runner_up?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Match {
  id: string;
  playerA: string | null;
  playerB: string | null;
  scoreA: number[];
  scoreB: number[];
  completed: boolean;
  nextMatchId?: string;
  round: number;
  barrage?: { scoreA: number; scoreB: number };
  streamLink?: string;
}

export interface Player {
  id: string;
  name: string;
  trophies: number;
  second_place: number;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// TOURNAMENT OPERATIONS
// ============================================================================

export async function loadActiveTournament(): Promise<Tournament | null> {
  try {
    const tournament = await getActiveTournament();
    return tournament as Tournament | null;
  } catch (error) {
    console.error('Error loading active tournament:', error);
    return null;
  }
}

export async function loadHistoricalTournaments(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('historical_tournaments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading historical tournaments:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error loading historical tournaments:', error);
    return [];
  }
}

export async function createNewTournament(tournament: Tournament): Promise<Tournament> {
  try {
    const tournaments = await getTournaments();
    for (const t of tournaments) {
      if (t.is_active) {
        await updateTournament(t.id, { is_active: false });
      }
    }

    const created = await createTournament({
      ...tournament,
      is_active: true,
    });

    return created as Tournament;
  } catch (error) {
    console.error('Error creating tournament:', error);
    throw error;
  }
}

export async function updateCurrentTournament(tournament: Tournament): Promise<Tournament> {
  try {
    const updated = await updateTournament(tournament.id, tournament);
    return updated as Tournament;
  } catch (error) {
    console.error('Error updating tournament:', error);
    throw error;
  }
}

export async function finalizeTournament(tournament: Tournament): Promise<void> {
  try {
    // Detect runner_up from the final match
    let runner_up = tournament.runner_up;
    if (!runner_up) {
      const finalMatch = tournament.bracket.find((m) => !m.nextMatchId);
      if (finalMatch && finalMatch.completed) {
        runner_up = (finalMatch.scoreA[0] > finalMatch.scoreB[0]
          ? finalMatch.playerB
          : finalMatch.playerA) ?? undefined;
      }
    }

    await saveTournamentToHistory({ ...tournament, runner_up });
    await updateTournament(tournament.id, { is_active: false });
  } catch (error) {
    console.error('Error finalizing tournament:', error);
    throw error;
  }
}

// ============================================================================
// PLAYER OPERATIONS
// ============================================================================

export async function loadPlayers(): Promise<Player[]> {
  try {
    const players = await getPlayers();
    return players as Player[];
  } catch (error) {
    console.error('Error loading players:', error);
    return [];
  }
}

export async function createNewPlayer(name: string): Promise<Player> {
  try {
    const existing = await getPlayer(name);
    if (existing) {
      throw new Error(`Player "${name}" already exists`);
    }

    const player = await createPlayer({
      name,
      trophies: 0,
      second_place: 0,
    });

    return player as Player;
  } catch (error) {
    console.error('Error creating player:', error);
    throw error;
  }
}

export async function updatePlayerStats(playerId: string, stats: Partial<Omit<Player, 'id' | 'name' | 'created_at' | 'updated_at'>>): Promise<Player> {
  try {
    const updated = await updatePlayer(playerId, stats);
    return updated as Player;
  } catch (error) {
    console.error('Error updating player stats:', error);
    throw error;
  }
}

export async function ensurePlayerExists(name: string): Promise<Player> {
  try {
    const existing = await getPlayer(name);
    if (existing) {
      return existing as Player;
    }
    return await createNewPlayer(name);
  } catch (error) {
    console.error('Error ensuring player exists:', error);
    throw error;
  }
}

export async function incrementPlayerWins(name: string): Promise<Player> {
  try {
    const player = await ensurePlayerExists(name);
    return await updatePlayerStats(player.id, { trophies: player.trophies + 1 });
  } catch (error) {
    console.error('Error incrementing player wins:', error);
    throw error;
  }
}

export async function incrementPlayerFinals(name: string): Promise<Player> {
  try {
    const player = await ensurePlayerExists(name);
    return await updatePlayerStats(player.id, { second_place: player.second_place + 1 });
  } catch (error) {
    console.error('Error incrementing player finals:', error);
    throw error;
  }
}

export async function deletePlayer(playerId: string): Promise<void> {
  try {
    await supabase.from('players').delete().eq('id', playerId);
  } catch (error) {
    console.error('Error deleting player:', error);
    throw error;
  }
}

// ============================================================================
// SETTINGS OPERATIONS
// ============================================================================

export async function loadSetting(key: string, defaultValue?: any): Promise<any> {
  try {
    const value = await getSetting(key);
    return value ?? defaultValue;
  } catch (error) {
    console.error('Error loading setting:', error);
    return defaultValue;
  }
}

export async function saveSetting(key: string, value: any): Promise<void> {
  try {
    await setSetting(key, value);
  } catch (error) {
    console.error('Error saving setting:', error);
    throw error;
  }
}

export async function loadTournamentName(): Promise<string> {
  return loadSetting('tournamentName', '');
}

export async function saveTournamentName(name: string): Promise<void> {
  return saveSetting('tournamentName', name);
}

export async function loadNextTournamentDate(): Promise<string> {
  return loadSetting('nextTournamentDate', '');
}

export async function saveNextTournamentDate(date: string): Promise<void> {
  return saveSetting('nextTournamentDate', date);
}

export async function loadWhatsappLink(): Promise<string> {
  return loadSetting('whatsappLink', '');
}

export async function saveWhatsappLink(link: string): Promise<void> {
  return saveSetting('whatsappLink', link);
}

export async function loadBackgroundImage(): Promise<string> {
  return loadSetting('backgroundImage', '/tournament-bg.jpg');
}

export async function saveBackgroundImage(url: string): Promise<void> {
  return saveSetting('backgroundImage', url);
}