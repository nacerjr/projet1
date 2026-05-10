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
  social_link?: string;
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

  // Check barrage first
  if (allerMatch.barrageMatchId) {
    const barrageMatch = bracket.find(m => m.id === allerMatch.barrageMatchId);
    if (barrageMatch?.completed) {
      const w = barrageMatch.scoreA[0] > barrageMatch.scoreB[0]
        ? barrageMatch.playerA
        : barrageMatch.playerB;
      return { winner: w, needsBarrage: false };
    }
  }

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
// TOURNAMENT WINNER DETECTION — works for ALL formats
// ============================================================================

/**
 * Detects the tournament winner from the bracket regardless of format.
 * Returns { winner, runnerUp }
 */
export function detectTournamentWinner(tournament: Tournament): { winner: string | null; runnerUp: string | null } {
  const bracket = tournament.bracket;
  const format = tournament.format;

  if (format === 'Single Elimination') {
    // The final match has no nextMatchId and is not a barrage
    const finalMatch = bracket.find(m => !m.nextMatchId && !m.isBarrage && m.matchType !== 'barrage' && m.matchType !== 'bo3_match2' && m.matchType !== 'bo3_match3' && m.matchType !== 'retour');
    if (!finalMatch || !finalMatch.completed) return { winner: null, runnerUp: null };
    const winner = getSingleMatchWinner(finalMatch);
    const runnerUp = winner
      ? (winner === finalMatch.playerA ? finalMatch.playerB : finalMatch.playerA)
      : null;
    return { winner, runnerUp };
  }

  if (format === 'Double Elimination') {
    // Find the aller match in the final round (no nextMatchId)
    const finalAllerMatch = bracket.find(m => m.matchType === 'aller' && !m.nextMatchId);
    if (!finalAllerMatch) return { winner: null, runnerUp: null };
    const { winner } = getDoubleElimWinner(bracket, finalAllerMatch);
    const runnerUp = winner
      ? (winner === finalAllerMatch.playerA ? finalAllerMatch.playerB : finalAllerMatch.playerA)
      : null;
    return { winner, runnerUp };
  }

  if (format === 'Best of 3') {
    // Find the bo3_match1 in the final round (no nextMatchId)
    const finalMatch1 = bracket.find(m => m.matchType === 'bo3_match1' && !m.nextMatchId);
    if (!finalMatch1) return { winner: null, runnerUp: null };
    const { winner } = getBo3Winner(bracket, finalMatch1);
    const runnerUp = winner
      ? (winner === finalMatch1.playerA ? finalMatch1.playerB : finalMatch1.playerA)
      : null;
    return { winner, runnerUp };
  }

  return { winner: null, runnerUp: null };
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
    const { runner_up, ...safeData } = tournament as any;
    const updated = await updateTournament(tournament.id, safeData);
    return updated as Tournament;
  } catch (error) {
    console.error('Error updating tournament:', error);
    throw error;
  }
}

export async function finalizeTournament(tournament: Tournament & { runner_up?: string }): Promise<void> {
  try {
    // Auto-detect winner/runner_up if not provided
    let winner = tournament.winner;
    let runner_up = tournament.runner_up;

    if (!winner || !runner_up) {
      const detected = detectTournamentWinner(tournament);
      if (!winner && detected.winner) winner = detected.winner;
      if (!runner_up && detected.runnerUp) runner_up = detected.runnerUp ?? undefined;
    }

    // Save to historical_tournaments (runner_up column exists here)
    await saveTournamentToHistory({
      ...tournament,
      winner: winner ?? tournament.winner,
      runner_up: runner_up ?? undefined,
    });

    // Deactivate (no runner_up column on tournaments table)
    await updateTournament(tournament.id, { is_active: false });
  } catch (error) {
    console.error('Error finalizing tournament:', error);
    throw error;
  }
}

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
    if (existing) throw new Error(`Player "${name}" already exists`);
    const player = await createPlayer({ name, trophies: 0, second_place: 0 });
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

export async function loadTournamentName(): Promise<string> { return loadSetting('tournamentName', ''); }
export async function saveTournamentName(name: string): Promise<void> { return saveSetting('tournamentName', name); }
export async function loadNextTournamentDate(): Promise<string> { return loadSetting('nextTournamentDate', ''); }
export async function saveNextTournamentDate(date: string): Promise<void> { return saveSetting('nextTournamentDate', date); }
export async function loadWhatsappLink(): Promise<string> { return loadSetting('whatsappLink', ''); }
export async function saveWhatsappLink(link: string): Promise<void> { return saveSetting('whatsappLink', link); }
export async function loadBackgroundImage(): Promise<string> { return loadSetting('backgroundImage', ''); }
export async function saveBackgroundImage(url: string): Promise<void> { return saveSetting('backgroundImage', url); }
export async function loadBackgroundVideo(): Promise<string> {
  return loadSetting('backgroundVideo', '');
}
export async function saveBackgroundVideo(url: string): Promise<void> {
  return saveSetting('backgroundVideo', url);
}