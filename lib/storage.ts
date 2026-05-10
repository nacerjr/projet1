// Storage utilities for cup - now with Supabase support
import { supabase, getActiveTournament, getTournaments, getPlayers, getSetting, setSetting, upsertPlayer as supabaseUpsertPlayer } from './supabase';

type StorageKey = 
  | 'tournamentName'
  | 'nextTournamentDate'
  | 'showCountdown'
  | 'whatsappLink'
  | 'backgroundImage'
  | 'currentTournament'
  | 'players'
  | 'historicalTournaments'
  | 'theme';

export interface Tournament {
  id: string;
  name: string;
  date?: string;
  size: 8 | 16 | 32 | 64 | 128 | 256;
  format: 'Élimination directe' | 'Aller-retour' | 'Best of 3';
  players: (string | null)[];
  bracket: Match[];
  winner?: string;
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
  wins: number;
  finals: number;
}

export interface StorageData {
  tournamentName: string;
  nextTournamentDate: string;
  showCountdown: boolean;
  whatsappLink: string;
  backgroundImage: string;
  currentTournament: Tournament | null;
  players: Player[];
  historicalTournaments: Tournament[];
  theme: 'light' | 'dark';
}

const defaultData: StorageData = {
  tournamentName: '',
  nextTournamentDate: '',
  showCountdown: true,
  whatsappLink: '',
  backgroundImage: '',
  currentTournament: null,
  players: [],
  historicalTournaments: [],
  theme: 'dark',
};

export function getStorage<K extends StorageKey>(key: K): any {
  if (typeof window === 'undefined') return defaultData[key];
  try {
    const item = localStorage.getItem(`cup_${key}`);
    return item ? JSON.parse(item) : defaultData[key];
  } catch {
    return defaultData[key];
  }
}

export function setStorage<K extends StorageKey>(key: K, value: any): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`cup_${key}`, JSON.stringify(value));
  } catch (error) {
    console.error('Storage error:', error);
  }
}

export function getAllStorage(): StorageData {
  if (typeof window === 'undefined') return defaultData;
  return {
    tournamentName: getStorage('tournamentName'),
    nextTournamentDate: getStorage('nextTournamentDate'),
    showCountdown: getStorage('showCountdown'),
    whatsappLink: getStorage('whatsappLink'),
    backgroundImage: getStorage('backgroundImage'),
    currentTournament: getStorage('currentTournament'),
    players: getStorage('players'),
    historicalTournaments: getStorage('historicalTournaments'),
    theme: getStorage('theme'),
  };
}

export function resetAllStorage(): void {
  if (typeof window === 'undefined') return;
  Object.keys(defaultData).forEach((key) => {
    localStorage.removeItem(`cup_${key}`);
  });
}

// Supabase sync functions
export async function syncFromSupabase() {
  try {
    // Fetch active tournament from Supabase
    const tournament = await getActiveTournament();
    if (tournament) {
      setStorage('currentTournament', tournament);
    }

    // Fetch players from Supabase
    const players = await getPlayers();
    const localPlayers = players.map((p: any) => ({
      id: p.id,
      name: p.name,
      wins: p.trophies,
      finals: p.second_place,
    }));
    setStorage('players', localPlayers);

    // Fetch settings from Supabase
    const tournamentName = await getSetting('tournamentName');
    if (tournamentName) setStorage('tournamentName', tournamentName);

    const nextTournamentDate = await getSetting('nextTournamentDate');
    if (nextTournamentDate) setStorage('nextTournamentDate', nextTournamentDate);

    const whatsappLink = await getSetting('whatsappLink');
    if (whatsappLink) setStorage('whatsappLink', whatsappLink);

    return true;
  } catch (error) {
    console.error('Error syncing from Supabase:', error);
    return false;
  }
}

export async function syncToSupabase() {
  try {
    // Sync settings
    const tournamentName = getStorage('tournamentName');
    if (tournamentName) await setSetting('tournamentName', tournamentName);

    const nextTournamentDate = getStorage('nextTournamentDate');
    if (nextTournamentDate) await setSetting('nextTournamentDate', nextTournamentDate);

    const whatsappLink = getStorage('whatsappLink');
    if (whatsappLink) await setSetting('whatsappLink', whatsappLink);

    // Sync players
    const players = getStorage('players');
    for (const player of players) {
      await supabaseUpsertPlayer({
        name: player.name,
        trophies: player.wins,
        second_place: player.finals,
      });
    }

    return true;
  } catch (error) {
    console.error('Error syncing to Supabase:', error);
    return false;
  }
}
