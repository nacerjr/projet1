// Database layer - Supabase as the ONLY data source (no localStorage)
import { supabase, createTournament, updateTournament, deleteTournament, getActiveTournament, getTournaments, saveTournamentToHistory, getPlayers, getPlayer, createPlayer, updatePlayer, getSetting, setSetting } from './supabase';

export interface Tournament {
  id: string;
  name: string;
  date?: string;
  size: 8 | 16 | 32 | 64 | 128 | 256;
  format: 'Single Elimination' | 'Double Elimination' | 'Best of 3';
  bracket: Match[];
  winner?: string;
  runner_up?: string; // only used locally / for history, NOT stored on tournaments table
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
  streamLink?: string;

  // Double Elimination fields
  matchType?: 'aller' | 'retour' | 'barrage' | 'bo3_match1' | 'bo3_match2' | 'bo3_match3' | 'single';
  allerMatchId?: string;
  retourMatchId?: string;
  barrageMatchId?: string;
  bo3Match1Id?: string;
  bo3Match2Id?: string;
  bo3Match3Id?: string;
  isBarrage?: boolean;
  barrageNeeded?: boolean;
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
// WINNER LOGIC HELPERS
// ============================================================================

export function getSingleMatchWinner(match: Match): string | null {
  if (!match.completed) return null;
  if (!match.playerA && match.playerB) return match.playerB;
  if (!match.playerB && match.playerA) return match.playerA;
  if (!match.playerA || !match.playerB) return null;
  if (match.scoreA[0] > match.scoreB[0]) return match.playerA;
  if (match.scoreB[0] > match.scoreA[0]) return match.playerB;
  return null;
}

export function getDoubleElimWinner(
  bracket: Match[],
  allerMatch: Match
): { winner: string | null; needsBarrage: boolean } {
  if (!allerMatch.retourMatchId) return { winner: null, needsBarrage: false };
  const retourMatch = bracket.find(m => m.id === allerMatch.retourMatchId);
  if (!retourMatch) return { winner: null, needsBarrage: false };

  if (!allerMatch.completed || !retourMatch.completed) return { winner: null, needsBarrage: false };

  const pA = allerMatch.playerA;
  const pB = allerMatch.playerB;
  if (!pA || !pB) return { winner: null, needsBarrage: false };

  const aggA = allerMatch.scoreA[0] + retourMatch.scoreA[0];
  const aggB = allerMatch.scoreB[0] + retourMatch.scoreB[0];

  if (aggA > aggB) return { winner: pA, needsBarrage: false };
  if (aggB > aggA) return { winner: pB, needsBarrage: false };
  return { winner: null, needsBarrage: true };
}

export function getBo3Winner(
  bracket: Match[],
  match1: Match
): { winner: string | null; needsMatch3: boolean } {
  if (!match1.bo3Match2Id) return { winner: null, needsMatch3: false };
  const match2 = bracket.find(m => m.id === match1.bo3Match2Id);
  if (!match2) return { winner: null, needsMatch3: false };

  if (!match1.completed) return { winner: null, needsMatch3: false };
  const w1 = getSingleMatchWinner(match1);
  if (!w1) return { winner: null, needsMatch3: false };

  if (!match2.completed) return { winner: null, needsMatch3: false };
  const w2 = getSingleMatchWinner(match2);
  if (!w2) return { winner: null, needsMatch3: false };

  if (w1 === w2) return { winner: w1, needsMatch3: false };

  if (!match1.bo3Match3Id) return { winner: null, needsMatch3: true };
  const match3 = bracket.find(m => m.id === match1.bo3Match3Id);
  if (!match3 || !match3.completed) return { winner: null, needsMatch3: true };

  const w3 = getSingleMatchWinner(match3);
  return { winner: w3, needsMatch3: true };
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

    // Don't pass runner_up to tournaments table — column doesn't exist there
    const { runner_up, ...tournamentData } = tournament as any;

    const created = await createTournament({
      ...tournamentData,
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
    // Strip runner_up — not a column on tournaments table
    const { runner_up, ...safeData } = tournament as any;
    const updated = await updateTournament(tournament.id, safeData);
    return updated as Tournament;
  } catch (error) {
    console.error('Error updating tournament:', error);
    throw error;
  }
}

export async function finalizeTournament(tournament: Tournament): Promise<void> {
  try {
    let runner_up = tournament.runner_up;
    if (!runner_up) {
      const finalMatch = tournament.bracket.find((m) => !m.nextMatchId && !m.isBarrage);
      if (finalMatch && finalMatch.completed) {
        runner_up = (finalMatch.scoreA[0] > finalMatch.scoreB[0]
          ? finalMatch.playerB
          : finalMatch.playerA) ?? undefined;
      }
    }

    // Save to history (runner_up IS a column on historical_tournaments)
    await saveTournamentToHistory({ ...tournament, runner_up });

    // Deactivate the tournament (no runner_up column here)
    await updateTournament(tournament.id, { is_active: false });
  } catch (error) {
    console.error('Error finalizing tournament:', error);
    throw error;
  }
}

/**
 * Force delete the active tournament without archiving it.
 * Used when admin wants to wipe a stuck/incomplete tournament.
 */
export async function forceDeleteActiveTournament(): Promise<void> {
  try {
    const active = await getActiveTournament();
    if (!active) return;
    await deleteTournament(active.id);
  } catch (error) {
    console.error('Error force deleting tournament:', error);
    throw error;
  }
}

/**
 * Force delete a specific tournament by id.
 */
export async function forceDeleteTournament(id: string): Promise<void> {
  try {
    await deleteTournament(id);
  } catch (error) {
    console.error('Error force deleting tournament:', error);
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
    if (existing) return existing as Player;
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