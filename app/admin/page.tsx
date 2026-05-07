'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as db from '@/lib/db';
import { Tournament, Match, Player } from '@/lib/db';
import { ThemeToggle } from '@/components/ThemeProvider';
import { generateBracket } from '@/lib/bracket';
import { v4 as uuidv4 } from 'uuid';
import { Trophy, Trash2, Check, History } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'tournament' | 'results' | 'players' | 'finish' | 'history'>('general');

  useEffect(() => {
    const key = searchParams.get('key');
    if (key === 'tournex2025') setAuthorized(true);
    else router.push('/');
  }, [searchParams, router]);

  if (!authorized) return null;

  return (
    <div className="min-h-screen max-w-2xl mx-auto p-4" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold" style={{ color: 'var(--gold)' }}>Admin Panel</h1>
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
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className="px-4 py-2 rounded transition-colors font-semibold"
            style={{ backgroundColor: activeTab === tab.id ? 'var(--gold)' : 'var(--bg-card)', color: activeTab === tab.id ? 'var(--bg-primary)' : 'var(--text-primary)' }}>
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

// ─── General Settings ────────────────────────────────────────────────────────
function GeneralSettings() {
  const [whatsappLink, setWhatsappLink] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    db.loadWhatsappLink().then((link) => setWhatsappLink(link || ''));
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await db.saveWhatsappLink(whatsappLink);
      alert('Settings saved!');
    } catch {
      alert('Error saving settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6 rounded-lg" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <div>
        <label className="block text-sm font-semibold mb-2">WhatsApp Link</label>
        <input type="text" value={whatsappLink} onChange={(e) => setWhatsappLink(e.target.value)}
          placeholder="https://chat.whatsapp.com/..."
          className="w-full rounded px-3 py-2"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
      </div>
      <button onClick={handleSave} disabled={loading}
        className="w-full font-bold py-2 rounded transition-colors"
        style={{ backgroundColor: loading ? 'var(--text-secondary)' : 'var(--gold)', color: 'var(--bg-primary)', cursor: loading ? 'not-allowed' : 'pointer' }}>
        {loading ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}

// ─── Tournament Setup ─────────────────────────────────────────────────────────
function TournamentSetup() {
  const [tournamentName, setTournamentName] = useState('');
  const [size, setSize] = useState<8 | 16 | 32 | 64 | 128 | 256>(8);
  const [format, setFormat] = useState<'Single Elimination' | 'Double Elimination' | 'Round Robin'>('Single Elimination');
  const [players, setPlayers] = useState<string[]>(Array(8).fill(''));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    db.loadTournamentName().then((n) => setTournamentName(n || ''));
  }, []);

  const handleSizeChange = (newSize: 8 | 16 | 32 | 64 | 128 | 256) => {
    setSize(newSize);
    setPlayers(Array(newSize).fill(''));
  };

  const handleGenerateBracket = async () => {
    const filledPlayers = players.filter((p) => p.trim());
    if (filledPlayers.length === 0) { alert('Enter at least one player'); return; }

    setLoading(true);
    try {
      const bracket = generateBracket(players.map((p) => p || 'TBD'), size, format);
      const tournament: Tournament = {
        id: uuidv4(),
        name: tournamentName || `Tournament ${size} players`,
        size, format: format as any, bracket, is_active: true,
      };
      await db.createNewTournament(tournament);
      await db.saveTournamentName(tournamentName);
      alert('Bracket generated successfully!');
    } catch (error) {
      console.error(error);
      alert('Error generating bracket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6 rounded-lg" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <div>
        <label className="block text-sm font-semibold mb-2">Tournament Name</label>
        <input type="text" value={tournamentName} onChange={(e) => setTournamentName(e.target.value)}
          placeholder="e.g., Spring Championship"
          className="w-full rounded px-3 py-2 text-sm"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-3">Tournament Size</label>
        <div className="grid grid-cols-3 gap-2">
          {([8, 16, 32, 64, 128, 256] as const).map((s) => (
            <button key={s} onClick={() => handleSizeChange(s)}
              className="py-2 rounded transition-colors font-semibold"
              style={{ backgroundColor: size === s ? 'var(--gold)' : 'var(--bg-secondary)', color: size === s ? 'var(--bg-primary)' : 'var(--text-primary)' }}>
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
              <input type="radio" name="format" value={f} checked={format === f} onChange={(e) => setFormat(e.target.value as any)} className="w-4 h-4" />
              <span>{f}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold mb-3">Player Names</label>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {players.map((player, i) => (
            <input key={i} type="text" value={player}
              onChange={(e) => { const p = [...players]; p[i] = e.target.value; setPlayers(p); }}
              placeholder={`Player ${i + 1}`}
              className="w-full rounded px-3 py-2 text-sm"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
          ))}
        </div>
      </div>
      <button onClick={handleGenerateBracket} disabled={loading}
        className="w-full font-bold py-2 rounded transition-colors"
        style={{ backgroundColor: loading ? 'var(--text-secondary)' : 'var(--gold)', color: 'var(--bg-primary)', cursor: loading ? 'not-allowed' : 'pointer' }}>
        {loading ? 'Generating...' : 'Generate Bracket'}
      </button>
    </div>
  );
}

// ─── Results Entry ────────────────────────────────────────────────────────────
function ResultsEntry() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    db.loadActiveTournament().then((t) => { setTournament(t); setLoading(false); });
  }, []);

  const handleScoreChange = (matchId: string, player: 'A' | 'B', value: string) => {
    if (!tournament) return;
    // Allow empty string while typing, parse to number on blur/save
    const score = value === '' ? 0 : Math.max(0, parseInt(value) || 0);
    setTournament({
      ...tournament,
      bracket: tournament.bracket.map((m) => {
        if (m.id !== matchId) return m;
        return player === 'A'
          ? { ...m, scoreA: [score, ...m.scoreA.slice(1)] }
          : { ...m, scoreB: [score, ...m.scoreB.slice(1)] };
      }),
    });
  };

  const handleStreamLinkChange = (matchId: string, link: string) => {
    if (!tournament) return;
    setTournament({
      ...tournament,
      bracket: tournament.bracket.map((m) => m.id === matchId ? { ...m, streamLink: link } : m),
    });
  };

  const handleToggleComplete = (matchId: string) => {
    if (!tournament) return;
    const match = tournament.bracket.find((m) => m.id === matchId);
    if (!match) return;

    const completing = !match.completed;
    let updatedBracket = tournament.bracket.map((m) =>
      m.id === matchId ? { ...m, completed: completing } : m
    );

    if (match.nextMatchId) {
      // Always clear the slot this match previously filled in the next match
      // then re-fill if completing
      const prevWinner = match.scoreA[0] > match.scoreB[0] ? match.playerA : match.playerB;
      const prevLoser  = match.scoreA[0] > match.scoreB[0] ? match.playerB : match.playerA;

      updatedBracket = updatedBracket.map((m) => {
        if (m.id !== match.nextMatchId) return m;
        // Remove the old winner from whichever slot it occupies
        let pA = m.playerA === prevWinner ? null : m.playerA;
        let pB = m.playerB === prevWinner ? null : m.playerB;
        // Also clear loser just in case of accidental fill
        if (pA === prevLoser) pA = null;
        if (pB === prevLoser) pB = null;

        if (completing) {
          const newWinner = match.scoreA[0] > match.scoreB[0] ? match.playerA : match.playerB;
          // Fill first empty slot
          if (pA === null || pA === '') pA = newWinner;
          else if (pB === null || pB === '') pB = newWinner;
        }
        return { ...m, playerA: pA, playerB: pB };
      });
    }

    setTournament({ ...tournament, bracket: updatedBracket });
  };

  const handleSave = async () => {
    if (!tournament) return;
    setSaving(true);
    try {
      await db.updateCurrentTournament(tournament);
      alert('Results saved!');
    } catch {
      alert('Error saving results');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTournament = async () => {
    if (!tournament) return;
    if (!confirm(`Delete the tournament "${tournament.name}" permanently? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await db.updateCurrentTournament({ ...tournament, is_active: false });
      setTournament(null);
      alert('Tournament deleted.');
    } catch {
      alert('Error deleting tournament');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading tournament...</div>;
  if (!tournament) return (
    <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
      No active tournament. Generate a bracket first.
    </div>
  );

  const matchesByRound = tournament.bracket.reduce((acc, match) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  const sortedRounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg flex items-center justify-between" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div>
          <p className="font-semibold" style={{ color: 'var(--gold)' }}>{tournament.name}</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{tournament.format} • {tournament.size} players</p>
        </div>
        <button onClick={handleDeleteTournament} disabled={deleting}
          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold"
          style={{ backgroundColor: '#dc2626', color: 'white', cursor: deleting ? 'not-allowed' : 'pointer' }}>
          <Trash2 size={12} />
          {deleting ? '...' : 'Delete'}
        </button>
      </div>

      {sortedRounds.map((round) => {
        const roundMatches = matchesByRound[round];
        const total = roundMatches.length * 2;
        const roundName = total === 2 ? 'Final' : total === 4 ? 'Semi-Final' : total === 8 ? 'Quarter-Final' : `Round of ${total}`;
        return (
          <div key={round}>
            <h3 className="text-sm font-bold mb-3 uppercase tracking-wide" style={{ color: 'var(--gold)' }}>{roundName}</h3>
            <div className="space-y-4">
              {roundMatches.map((match) => (
                <div key={match.id} className="p-4 rounded-lg space-y-3" style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${match.completed ? 'var(--gold)' : 'var(--border-color)'}` }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Match {match.id.slice(-6)}</span>
                    {match.completed && <span className="text-xs font-bold" style={{ color: 'var(--gold)' }}>✓ Done</span>}
                  </div>

                  {/* Player A */}
                  <div className="flex items-center gap-3">
                    <span className="flex-1 text-sm font-medium truncate">{match.playerA || 'TBD'}</span>
                    <input
                      type="number" min={0}
                      value={match.scoreA[0] === 0 ? '' : match.scoreA[0]}
                      placeholder="0"
                      onChange={(e) => handleScoreChange(match.id, 'A', e.target.value)}
                      className="w-14 rounded px-2 py-1 text-center font-bold text-sm"
                      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--gold)' }} />
                  </div>

                  {/* Player B */}
                  <div className="flex items-center gap-3">
                    <span className="flex-1 text-sm font-medium truncate">{match.playerB || 'TBD'}</span>
                    <input
                      type="number" min={0}
                      value={match.scoreB[0] === 0 ? '' : match.scoreB[0]}
                      placeholder="0"
                      onChange={(e) => handleScoreChange(match.id, 'B', e.target.value)}
                      className="w-14 rounded px-2 py-1 text-center font-bold text-sm"
                      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--gold)' }} />
                  </div>

                  {/* Stream link */}
                  <input type="text" value={match.streamLink || ''} onChange={(e) => handleStreamLinkChange(match.id, e.target.value)}
                    placeholder="Stream link (optional)"
                    className="w-full rounded px-2 py-1 text-xs"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />

                  <button onClick={() => handleToggleComplete(match.id)}
                    className="w-full py-1.5 rounded text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                    style={{ backgroundColor: match.completed ? '#16a34a' : 'var(--bg-secondary)', color: match.completed ? 'white' : 'var(--text-primary)', border: `1px solid ${match.completed ? '#16a34a' : 'var(--border-color)'}` }}>
                    <Check size={14} />
                    {match.completed ? 'Mark Incomplete' : 'Mark Complete'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <button onClick={handleSave} disabled={saving}
        className="w-full font-bold py-3 rounded transition-colors sticky bottom-4"
        style={{ backgroundColor: saving ? 'var(--text-secondary)' : 'var(--gold)', color: 'var(--bg-primary)', cursor: saving ? 'not-allowed' : 'pointer' }}>
        {saving ? 'Saving...' : 'Save All Results'}
      </button>
    </div>
  );
}

// ─── Players Management ───────────────────────────────────────────────────────
function PlayersManagement() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.loadPlayers().then((p) => { setPlayers(p); setLoading(false); });
  }, []);

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) { alert('Enter a player name'); return; }
    try {
      const player = await db.createNewPlayer(newPlayerName.trim());
      setPlayers([...players, player]);
      setNewPlayerName('');
    } catch (error) {
      alert((error as any).message || 'Error adding player');
    }
  };

  const handleUpdatePlayer = async (playerId: string, updates: Partial<Player>) => {
    try {
      await db.updatePlayerStats(playerId, updates);
      setPlayers(players.map((p) => p.id === playerId ? { ...p, ...updates } : p));
    } catch {
      alert('Error updating player');
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!confirm('Delete this player?')) return;
    try {
      await db.deletePlayer(playerId);
      setPlayers(players.filter((p) => p.id !== playerId));
    } catch {
      alert('Error deleting player');
    }
  };

  if (loading) return <div className="text-center py-8">Loading players...</div>;

  return (
    <div className="space-y-6 p-6 rounded-lg" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <div>
        <label className="block text-sm font-semibold mb-2">Add New Player</label>
        <div className="flex gap-2">
          <input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
            placeholder="Player name"
            className="flex-1 rounded px-3 py-2 text-sm"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
          <button onClick={handleAddPlayer} className="px-4 py-2 rounded font-semibold"
            style={{ backgroundColor: 'var(--gold)', color: 'var(--bg-primary)' }}>Add</button>
        </div>
      </div>
      <div className="space-y-3">
        {players.map((player) => (
          <div key={player.id} className="flex items-center gap-3 p-3 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{player.name}</div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                🏆 {player.trophies} wins · 🥈 {player.second_place} finals
              </div>
            </div>
            <input type="number" value={player.trophies}
              onChange={(e) => handleUpdatePlayer(player.id, { trophies: parseInt(e.target.value) || 0 })}
              className="w-14 rounded px-2 py-1 text-sm text-center"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--gold)' }}
              title="Trophies" />
            <input type="number" value={player.second_place}
              onChange={(e) => handleUpdatePlayer(player.id, { second_place: parseInt(e.target.value) || 0 })}
              className="w-14 rounded px-2 py-1 text-sm text-center"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
              title="Finals" />
            <button onClick={() => handleDeletePlayer(player.id)}
              className="p-1.5 rounded"
              style={{ backgroundColor: '#dc2626', color: 'white' }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {players.length === 0 && (
          <p className="text-center py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>No players yet</p>
        )}
      </div>
    </div>
  );
}

// ─── Finish Tournament ────────────────────────────────────────────────────────
function FinishTournament() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [winner, setWinner] = useState('');

  useEffect(() => {
    db.loadActiveTournament().then((t) => {
      setTournament(t);
      setLoading(false);
    });
  }, []);

  const getDetectedWinner = () => {
    if (!tournament) return null;
    const finalMatch = tournament.bracket.find((m) => !m.nextMatchId);
    if (!finalMatch || !finalMatch.completed) return null;
    return finalMatch.scoreA[0] > finalMatch.scoreB[0] ? finalMatch.playerA : finalMatch.playerB;
  };

  const handleFinish = async () => {
    if (!tournament) return;
    const finalWinner = winner || getDetectedWinner();
    if (!finalWinner) { alert('No winner detected. Make sure the final match is completed.'); return; }
    if (!confirm(`Finish tournament and declare "${finalWinner}" as winner?`)) return;

    setFinishing(true);
    try {
      const updated = { ...tournament, winner: finalWinner };
      await db.updateCurrentTournament(updated);
      await db.finalizeTournament(updated);
      await db.incrementPlayerWins(finalWinner);
      // Find runner-up (loser of final)
      const finalMatch = tournament.bracket.find((m) => !m.nextMatchId);
      if (finalMatch) {
        const runnerUp = finalMatch.scoreA[0] > finalMatch.scoreB[0] ? finalMatch.playerB : finalMatch.playerA;
        if (runnerUp) await db.incrementPlayerFinals(runnerUp);
      }
      alert(`Tournament finished! Winner: ${finalWinner}`);
      setTournament(null);
    } catch (error) {
      console.error(error);
      alert('Error finishing tournament');
    } finally {
      setFinishing(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (!tournament) return (
    <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
      No active tournament to finish.
    </div>
  );

  const detectedWinner = getDetectedWinner();
  const completedMatches = tournament.bracket.filter((m) => m.completed).length;
  const totalMatches = tournament.bracket.length;

  return (
    <div className="space-y-6 p-6 rounded-lg" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <div>
        <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--gold)' }}>{tournament.name}</h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {completedMatches}/{totalMatches} matches completed
        </p>
      </div>

      <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="h-2 rounded-full transition-all" style={{ width: `${(completedMatches / totalMatches) * 100}%`, backgroundColor: 'var(--gold)' }} />
      </div>

      {detectedWinner ? (
        <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--gold-light)', border: '1px solid var(--gold)' }}>
          <Trophy size={32} className="mx-auto mb-2" style={{ color: 'var(--gold)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Detected Winner</p>
          <p className="text-xl font-bold" style={{ color: 'var(--gold)' }}>{detectedWinner}</p>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-semibold mb-2">Override Winner Name</label>
          <input type="text" value={winner} onChange={(e) => setWinner(e.target.value)}
            placeholder="Enter winner name manually"
            className="w-full rounded px-3 py-2 text-sm"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
        </div>
      )}

      <button onClick={handleFinish} disabled={finishing}
        className="w-full font-bold py-3 rounded flex items-center justify-center gap-2"
        style={{ backgroundColor: finishing ? 'var(--text-secondary)' : '#16a34a', color: 'white', cursor: finishing ? 'not-allowed' : 'pointer' }}>
        <Check size={18} />
        {finishing ? 'Finishing...' : 'Finish & Archive Tournament'}
      </button>
    </div>
  );
}

// ─── History Management ───────────────────────────────────────────────────────
function HistoryManagement() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Query the historical_tournaments table directly (separate from active tournaments)
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('historical_tournaments')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) setTournaments(data);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="text-center py-8">Loading history...</div>;
  if (tournaments.length === 0) return (
    <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
      No finished tournaments yet. Use "Finish" to archive a tournament.
    </div>
  );

  return (
    <div className="space-y-4">
      {tournaments.map((t) => (
        <div key={t.id} className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {t.format} · {t.size} players
                {t.date && ` · ${new Date(t.date).toLocaleDateString()}`}
              </p>
            </div>
            <History size={16} style={{ color: 'var(--text-secondary)' }} />
          </div>
          {t.winner && (
            <div className="flex items-center gap-2 mt-3" style={{ color: 'var(--gold)' }}>
              <Trophy size={16} />
              <span className="font-semibold text-sm">{t.winner}</span>
            </div>
          )}
          <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
            {t.bracket?.filter((m: any) => m.completed).length ?? 0}/{t.bracket?.length ?? 0} matches played
          </p>
        </div>
      ))}
    </div>
  );
}