'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as db from '@/lib/db';
import { Tournament, Match, Player } from '@/lib/db';
import { ThemeToggle } from '@/components/ThemeProvider';
import { generateBracket, getRoundName } from '@/lib/bracket';
import { v4 as uuidv4 } from 'uuid';

export default function AdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'general' | 'tournament' | 'results' | 'players' | 'finish' | 'history'
  >('general');

  useEffect(() => {
    const key = searchParams.get('key');
    if (key === 'tournex2025') {
      setAuthorized(true);
    } else {
      router.push('/');
    }
  }, [searchParams, router]);

  if (!authorized) return null;

  return (
    <div className="min-h-screen max-w-2xl mx-auto p-4" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold" style={{ color: 'var(--gold)' }}>
          Admin Panel
        </h1>
        <ThemeToggle />
      </div>

      <div className="flex flex-wrap gap-2 mb-8 pb-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
        {[
          { id: 'general', label: 'Settings' },
          { id: 'tournament', label: 'Configure' },
          { id: 'results', label: 'Results' },
          { id: 'players', label: 'Players' },
          { id: 'finish', label: 'Finish' },
          { id: 'history', label: 'History' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className="px-4 py-2 rounded transition-colors font-semibold"
            style={{
              backgroundColor: activeTab === tab.id ? 'var(--gold)' : 'var(--bg-card)',
              color: activeTab === tab.id ? 'var(--bg-primary)' : 'var(--text-primary)'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'general' && <GeneralSettings />}
        {activeTab === 'tournament' && <TournamentSetup />}
        {activeTab === 'results' && <ResultsEntry />}
        {activeTab === 'players' && <PlayersManagement />}
        {activeTab === 'finish' && <FinishTournament />}
        {activeTab === 'history' && <HistoryManagement />}
      </div>
    </div>
  );
}

// General Settings Component
function GeneralSettings() {
  const [whatsappLink, setWhatsappLink] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const link = await db.loadWhatsappLink();
        setWhatsappLink(link || '');
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await db.saveWhatsappLink(whatsappLink);
      alert('Settings saved');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6 rounded-lg" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <div>
        <label className="block text-sm font-semibold mb-2">WhatsApp Link</label>
        <input
          type="text"
          value={whatsappLink}
          onChange={(e) => setWhatsappLink(e.target.value)}
          placeholder="https://chat.whatsapp.com/..."
          className="w-full rounded px-3 py-2"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full font-bold py-2 rounded transition-colors"
        style={{ backgroundColor: loading ? 'var(--text-secondary)' : 'var(--gold)', color: 'var(--bg-primary)', cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        {loading ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}

// Tournament Setup Component
function TournamentSetup() {
  const [tournamentName, setTournamentName] = useState('');
  const [size, setSize] = useState<8 | 16 | 32 | 64 | 128 | 256>(8);
  const [format, setFormat] = useState<'Single Elimination' | 'Double Elimination' | 'Round Robin'>('Single Elimination');
  const [players, setPlayers] = useState<string[]>(Array(8).fill(''));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const name = await db.loadTournamentName();
        setTournamentName(name || '');
      } catch (error) {
        console.error('Error loading tournament name:', error);
      }
    };
    loadSettings();
  }, []);

  const handleSizeChange = (newSize: 8 | 16 | 32 | 64 | 128 | 256) => {
    setSize(newSize);
    setPlayers(Array(newSize).fill(''));
  };

  const handleGenerateBracket = async () => {
    if (players.every((p) => !p)) {
      alert('Enter at least one player');
      return;
    }

    setLoading(true);
    try {
      const bracket = generateBracket(
        players.map((p) => p || 'TBD'),
        size,
        format
      );

      const tournament: Tournament = {
        id: uuidv4(),
        name: tournamentName || `Tournament ${size} players`,
        size,
        format: format as any,
        bracket,
        is_active: true,
      };

      await db.createNewTournament(tournament);
      await db.saveTournamentName(tournamentName);
      alert('Bracket generated!');
    } catch (error) {
      console.error('Error generating bracket:', error);
      alert('Error generating bracket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6 rounded-lg" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <div>
        <label className="block text-sm font-semibold mb-2">Tournament Name</label>
        <input
          type="text"
          value={tournamentName}
          onChange={(e) => setTournamentName(e.target.value)}
          placeholder="e.g., Spring Championship"
          className="w-full rounded px-3 py-2 text-sm"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-3">Tournament Size</label>
        <div className="grid grid-cols-3 gap-2">
          {[8, 16, 32, 64, 128, 256].map((s) => (
            <button
              key={s}
              onClick={() => handleSizeChange(s as any)}
              className="py-2 rounded transition-colors font-semibold"
              style={{
                backgroundColor: size === s ? 'var(--gold)' : 'var(--bg-card)',
                color: size === s ? 'var(--bg-primary)' : 'var(--text-primary)'
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-3">Format</label>
        <div className="space-y-2">
          {['Single Elimination', 'Double Elimination', 'Round Robin'].map((f) => (
            <label key={f} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="format"
                value={f}
                checked={format === f}
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-4 h-4"
              />
              <span>{f}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-3">Player Names</label>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {players.map((player, i) => (
            <input
              key={i}
              type="text"
              value={player}
              onChange={(e) => {
                const newPlayers = [...players];
                newPlayers[i] = e.target.value;
                setPlayers(newPlayers);
              }}
              placeholder={`Player ${i + 1}`}
              className="w-full rounded px-3 py-2 text-sm"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
          ))}
        </div>
      </div>

      <button
        onClick={handleGenerateBracket}
        disabled={loading}
        className="w-full font-bold py-2 rounded transition-colors"
        style={{ backgroundColor: loading ? 'var(--text-secondary)' : 'var(--gold)', color: 'var(--bg-primary)', cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        {loading ? 'Generating...' : 'Generate Bracket'}
      </button>
    </div>
  );
}

// Results Entry Component
function ResultsEntry() {
  return (
    <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
      Loading results interface...
    </div>
  );
}

// Players Management Component
function PlayersManagement() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const data = await db.loadPlayers();
        setPlayers(data);
      } catch (error) {
        console.error('Error loading players:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPlayers();
  }, []);

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) {
      alert('Enter a player name');
      return;
    }

    try {
      const player = await db.createNewPlayer(newPlayerName);
      setPlayers([...players, player]);
      setNewPlayerName('');
      alert('Player created');
    } catch (error) {
      console.error('Error adding player:', error);
      alert((error as any).message || 'Error adding player');
    }
  };

  const handleUpdatePlayer = async (playerId: string, updates: Partial<Player>) => {
    try {
      await db.updatePlayerStats(playerId, updates);
      setPlayers(players.map((p) => p.id === playerId ? { ...p, ...updates } : p));
    } catch (error) {
      console.error('Error updating player:', error);
      alert('Error updating player');
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await db.deletePlayer(playerId);
      setPlayers(players.filter((p) => p.id !== playerId));
    } catch (error) {
      console.error('Error deleting player:', error);
      alert('Error deleting player');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading players...</div>;
  }

  return (
    <div className="space-y-6 p-6 rounded-lg" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <div>
        <label className="block text-sm font-semibold mb-2">Add New Player</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
            placeholder="Player name"
            className="flex-1 rounded px-3 py-2 text-sm"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          />
          <button
            onClick={handleAddPlayer}
            className="px-4 py-2 rounded font-semibold"
            style={{ backgroundColor: 'var(--gold)', color: 'var(--bg-primary)' }}
          >
            Add
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {players.map((player) => (
          <div key={player.id} className="flex items-center gap-3 p-3 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="flex-1">
              <div className="font-semibold">{player.name}</div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Trophies: {player.trophies} | Finals: {player.second_place}
              </div>
            </div>
            <input
              type="number"
              value={player.trophies}
              onChange={(e) => handleUpdatePlayer(player.id, { trophies: parseInt(e.target.value) || 0 })}
              placeholder="Trophies"
              className="w-16 rounded px-2 py-1 text-sm"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              title="Trophies"
            />
            <input
              type="number"
              value={player.second_place}
              onChange={(e) => handleUpdatePlayer(player.id, { second_place: parseInt(e.target.value) || 0 })}
              placeholder="Finals"
              className="w-16 rounded px-2 py-1 text-sm"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              title="Finals"
            />
            <button
              onClick={() => handleDeletePlayer(player.id)}
              className="px-3 py-1 rounded text-sm font-semibold"
              style={{ backgroundColor: '#dc2626', color: 'white' }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Finish Tournament Component
function FinishTournament() {
  return (
    <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
      Loading finish interface...
    </div>
  );
}

// History Management Component
function HistoryManagement() {
  return (
    <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
      Loading history interface...
    </div>
  );
}
