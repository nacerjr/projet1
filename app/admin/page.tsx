'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as db from '@/lib/db';
import { Tournament, Match, Player, getSingleMatchWinner, getDoubleElimWinner, getBo3Winner } from '@/lib/db';
import { ThemeToggle } from '@/components/ThemeProvider';
import { generateBracket } from '@/lib/bracket';
import { v4 as uuidv4 } from 'uuid';
import { Trophy, Trash2, Check, History } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
  const [format, setFormat] = useState<'Single Elimination' | 'Double Elimination' | 'Best of 3'>('Single Elimination');
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
        size,
        format,
        bracket,
        is_active: true,
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
          {(['Single Elimination', 'Double Elimination', 'Best of 3'] as const).map((f) => (
            <label key={f} className="flex items-center gap-3 cursor-pointer">
              <input type="radio" name="format" value={f} checked={format === f} onChange={() => setFormat(f)} className="w-4 h-4" />
              <span className="text-sm">
                {f === 'Single Elimination' && '🏆 Single Elimination — le gagnant avance'}
                {f === 'Double Elimination' && '🔄 Double Elimination — aller + retour (barrage si égalité)'}
                {f === 'Best of 3' && '3️⃣ Best of 3 — gagne 2/3 matchs pour passer'}
              </span>
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

  useEffect(() => {
    db.loadActiveTournament().then((t) => { setTournament(t); setLoading(false); });
  }, []);

  const updateMatch = (matchId: string, updates: Partial<Match>) => {
    if (!tournament) return;
    setTournament({
      ...tournament,
      bracket: tournament.bracket.map(m => m.id === matchId ? { ...m, ...updates } : m),
    });
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

  if (loading) return <div className="text-center py-8">Loading tournament...</div>;
  if (!tournament) return (
    <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
      No active tournament. Generate a bracket first.
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <p className="font-semibold" style={{ color: 'var(--gold)' }}>{tournament.name}</p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{tournament.format} • {tournament.size} players</p>
      </div>

      {tournament.format === 'Double Elimination' && (
        <DoubleElimResults tournament={tournament} updateMatch={updateMatch} />
      )}
      {tournament.format === 'Best of 3' && (
        <BestOf3Results tournament={tournament} updateMatch={updateMatch} />
      )}
      {tournament.format === 'Single Elimination' && (
        <SingleElimResults tournament={tournament} updateMatch={updateMatch} />
      )}

      <button onClick={handleSave} disabled={saving}
        className="w-full font-bold py-3 rounded transition-colors sticky bottom-4"
        style={{ backgroundColor: saving ? 'var(--text-secondary)' : 'var(--gold)', color: 'var(--bg-primary)', cursor: saving ? 'not-allowed' : 'pointer' }}>
        {saving ? 'Saving...' : 'Save All Results'}
      </button>
    </div>
  );
}

// ─── Single Elimination Results ───────────────────────────────────────────────
function SingleElimResults({ tournament, updateMatch }: { tournament: Tournament; updateMatch: (id: string, u: Partial<Match>) => void }) {
  const matchesByRound = tournament.bracket.reduce((acc, match) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, Match[]>);
  const sortedRounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);

  const handleToggleComplete = (match: Match) => {
    const completing = !match.completed;
    updateMatch(match.id, { completed: completing });

    if (match.nextMatchId && completing) {
      const winner = match.scoreA[0] > match.scoreB[0] ? match.playerA : match.playerB;
      const nextMatch = tournament.bracket.find(m => m.id === match.nextMatchId);
      if (nextMatch && winner) {
        const pA = !nextMatch.playerA ? winner : nextMatch.playerA;
        const pB = nextMatch.playerA && !nextMatch.playerB ? winner : nextMatch.playerB;
        updateMatch(match.nextMatchId, { playerA: pA, playerB: pB });
      }
    }
  };

  return (
    <div className="space-y-6">
      {sortedRounds.map((round) => {
        const matches = matchesByRound[round];
        const total = matches.length * 2;
        const roundName = total === 2 ? 'Final' : total === 4 ? 'Semi-Final' : total === 8 ? 'Quarter-Final' : `Round of ${total}`;
        return (
          <div key={round}>
            <h3 className="text-sm font-bold mb-3 uppercase tracking-wide" style={{ color: 'var(--gold)' }}>{roundName}</h3>
            <div className="space-y-4">
              {matches.map(match => (
                <SingleMatchEditor
                  key={match.id}
                  match={match}
                  onUpdate={(updates) => updateMatch(match.id, updates)}
                  onToggleComplete={() => handleToggleComplete(match)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Double Elimination Results ───────────────────────────────────────────────
function DoubleElimResults({ tournament, updateMatch }: { tournament: Tournament; updateMatch: (id: string, u: Partial<Match>) => void }) {
  const bracket = tournament.bracket;
  const allerMatches = bracket.filter(m => m.matchType === 'aller').sort((a, b) => a.round - b.round);

  // Group into logical rounds
  const roundGroups: Match[][] = [];
  let currentRoundNum = -1;
  let currentGroup: Match[] = [];
  allerMatches.forEach(am => {
    if (am.round !== currentRoundNum) {
      if (currentGroup.length > 0) roundGroups.push(currentGroup);
      currentGroup = [am];
      currentRoundNum = am.round;
    } else {
      currentGroup.push(am);
    }
  });
  if (currentGroup.length > 0) roundGroups.push(currentGroup);

  const getRoundName = (groupIndex: number, totalGroups: number) => {
    const fromEnd = totalGroups - groupIndex;
    if (fromEnd === 1) return 'Final';
    if (fromEnd === 2) return 'Semi-Final';
    if (fromEnd === 3) return 'Quarter-Final';
    return `Round ${groupIndex + 1}`;
  };

  const handleAllerComplete = (allerMatch: Match) => {
    const completing = !allerMatch.completed;
    updateMatch(allerMatch.id, { completed: completing });
  };

  const handleRetourComplete = (allerMatch: Match, retourMatch: Match) => {
    if (!allerMatch.completed) {
      alert('Entrez d\'abord le score aller et marquez-le terminé.');
      return;
    }
    const completing = !retourMatch.completed;
    updateMatch(retourMatch.id, { completed: completing });

    if (completing && allerMatch.barrageMatchId) {
      // Check if barrage is needed
      const aggA = allerMatch.scoreA[0] + retourMatch.scoreA[0];
      const aggB = allerMatch.scoreB[0] + retourMatch.scoreB[0];
      if (aggA === aggB) {
        // Set up barrage with same players
        updateMatch(allerMatch.barrageMatchId, {
          playerA: allerMatch.playerA,
          playerB: allerMatch.playerB,
          barrageNeeded: true,
        });
      } else {
        // Propagate winner to next match
        const winner = aggA > aggB ? allerMatch.playerA : allerMatch.playerB;
        if (allerMatch.nextMatchId && winner) {
          const nextMatch = bracket.find(m => m.id === allerMatch.nextMatchId);
          if (nextMatch) {
            const pA = !nextMatch.playerA ? winner : nextMatch.playerA;
            const pB = nextMatch.playerA && !nextMatch.playerB ? winner : nextMatch.playerB;
            updateMatch(allerMatch.nextMatchId, { playerA: pA, playerB: pB });
          }
        }
      }
    }
  };

  const handleBarrageComplete = (allerMatch: Match, barrageMatch: Match) => {
    const completing = !barrageMatch.completed;
    updateMatch(barrageMatch.id, { completed: completing });

    if (completing && allerMatch.nextMatchId) {
      const winner = barrageMatch.scoreA[0] > barrageMatch.scoreB[0] ? barrageMatch.playerA : barrageMatch.playerB;
      if (winner) {
        const nextMatch = bracket.find(m => m.id === allerMatch.nextMatchId);
        if (nextMatch) {
          const pA = !nextMatch.playerA ? winner : nextMatch.playerA;
          const pB = nextMatch.playerA && !nextMatch.playerB ? winner : nextMatch.playerB;
          updateMatch(allerMatch.nextMatchId, { playerA: pA, playerB: pB });
        }
      }
    }
  };

  return (
    <div className="space-y-8">
      {roundGroups.map((allerGroup, groupIdx) => {
        const roundName = getRoundName(groupIdx, roundGroups.length);
        return (
          <div key={groupIdx}>
            <h3 className="text-sm font-bold mb-4 uppercase tracking-wide" style={{ color: 'var(--gold)' }}>{roundName}</h3>
            <div className="space-y-6">
              {allerGroup.map((allerMatch, matchIdx) => {
                const retourMatch = bracket.find(m => m.id === allerMatch.retourMatchId);
                const barrageMatch = bracket.find(m => m.id === allerMatch.barrageMatchId);
                const { winner, needsBarrage } = getDoubleElimWinner(bracket, allerMatch);
                const aggA = (allerMatch.scoreA[0] || 0) + (retourMatch?.scoreA[0] || 0);
                const aggB = (allerMatch.scoreB[0] || 0) + (retourMatch?.scoreB[0] || 0);
                const showBarrage = needsBarrage || barrageMatch?.completed;

                return (
                  <div key={allerMatch.id} className="p-4 rounded-lg space-y-4" style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${winner ? 'var(--gold)' : 'var(--border-color)'}` }}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                        Match {matchIdx + 1}: {allerMatch.playerA || 'TBD'} vs {allerMatch.playerB || 'TBD'}
                      </span>
                      {winner && <span className="text-xs font-bold" style={{ color: 'var(--gold)' }}>✓ {winner}</span>}
                    </div>

                    {/* Aller */}
                    <div>
                      <div className="text-xs font-semibold mb-2" style={{ color: 'var(--gold)' }}>Aller</div>
                      <SingleMatchEditor
                        match={allerMatch}
                        onUpdate={(u) => updateMatch(allerMatch.id, u)}
                        onToggleComplete={() => handleAllerComplete(allerMatch)}
                      />
                    </div>

                    {/* Retour */}
                    {retourMatch && (
                      <div>
                        <div className="text-xs font-semibold mb-2" style={{ color: 'var(--gold)' }}>Retour</div>
                        <SingleMatchEditor
                          match={retourMatch}
                          onUpdate={(u) => updateMatch(retourMatch.id, u)}
                          onToggleComplete={() => handleRetourComplete(allerMatch, retourMatch)}
                          disabled={!allerMatch.completed}
                          disabledReason="Terminez d'abord le match aller"
                        />
                      </div>
                    )}

                    {/* Aggregate display */}
                    {allerMatch.completed && retourMatch?.completed && (
                      <div className="flex justify-between items-center px-3 py-2 rounded text-sm font-semibold" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <span style={{ color: aggA > aggB ? 'var(--gold)' : 'var(--text-secondary)' }}>
                          {allerMatch.playerA}: {aggA}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>Agrégat</span>
                        <span style={{ color: aggB > aggA ? 'var(--gold)' : 'var(--text-secondary)' }}>
                          {allerMatch.playerB}: {aggB}
                        </span>
                        {needsBarrage && (
                          <span className="text-xs px-2 py-1 rounded ml-2" style={{ backgroundColor: '#dc2626', color: 'white' }}>
                            Barrage requis!
                          </span>
                        )}
                      </div>
                    )}

                    {/* Barrage */}
                    {(showBarrage || needsBarrage) && barrageMatch && (
                      <div>
                        <div className="text-xs font-semibold mb-2 flex items-center gap-1" style={{ color: '#ef4444' }}>
                          ⚡ Barrage (égalité {aggA}-{aggB})
                        </div>
                        <SingleMatchEditor
                          match={barrageMatch}
                          onUpdate={(u) => updateMatch(barrageMatch.id, u)}
                          onToggleComplete={() => handleBarrageComplete(allerMatch, barrageMatch)}
                          disabled={!retourMatch?.completed}
                          disabledReason="Terminez d'abord le match retour"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Best of 3 Results ────────────────────────────────────────────────────────
function BestOf3Results({ tournament, updateMatch }: { tournament: Tournament; updateMatch: (id: string, u: Partial<Match>) => void }) {
  const bracket = tournament.bracket;
  const match1s = bracket.filter(m => m.matchType === 'bo3_match1').sort((a, b) => a.round - b.round);

  // Group into logical rounds
  const roundGroups: Match[][] = [];
  let currentRoundNum = -1;
  let currentGroup: Match[] = [];
  match1s.forEach(m => {
    if (m.round !== currentRoundNum) {
      if (currentGroup.length > 0) roundGroups.push(currentGroup);
      currentGroup = [m];
      currentRoundNum = m.round;
    } else {
      currentGroup.push(m);
    }
  });
  if (currentGroup.length > 0) roundGroups.push(currentGroup);

  const getRoundName = (groupIndex: number, totalGroups: number) => {
    const fromEnd = totalGroups - groupIndex;
    if (fromEnd === 1) return 'Final';
    if (fromEnd === 2) return 'Semi-Final';
    if (fromEnd === 3) return 'Quarter-Final';
    return `Round ${groupIndex + 1}`;
  };

  const handleMatch1Complete = (match1: Match) => {
    const completing = !match1.completed;
    updateMatch(match1.id, { completed: completing });

    if (completing && match1.bo3Match2Id) {
      // Set players on match 2
      updateMatch(match1.bo3Match2Id, {
        playerA: match1.playerA,
        playerB: match1.playerB,
      });
    }
  };

  const handleMatch2Complete = (match1: Match, match2: Match) => {
    if (!match1.completed) {
      alert('Terminez d\'abord le match 1.');
      return;
    }
    const completing = !match2.completed;
    updateMatch(match2.id, { completed: completing });

    if (completing) {
      const w1 = getSingleMatchWinner(match1);
      const w2 = getSingleMatchWinner({ ...match2, completed: true });

      if (!w1 || !w2) return;

      if (w1 === w2) {
        // Same winner — he advances directly, no match 3 needed
        if (match1.nextMatchId) {
          const nextMatch = bracket.find(m => m.id === match1.nextMatchId);
          if (nextMatch && w1) {
            const pA = !nextMatch.playerA ? w1 : nextMatch.playerA;
            const pB = nextMatch.playerA && !nextMatch.playerB ? w1 : nextMatch.playerB;
            updateMatch(match1.nextMatchId, { playerA: pA, playerB: pB });
          }
        }
      } else {
        // 1-1: set up match 3 barrage
        if (match1.bo3Match3Id) {
          updateMatch(match1.bo3Match3Id, {
            playerA: match1.playerA,
            playerB: match1.playerB,
          });
        }
      }
    }
  };

  const handleMatch3Complete = (match1: Match, match3: Match) => {
    const completing = !match3.completed;
    updateMatch(match3.id, { completed: completing });

    if (completing && match1.nextMatchId) {
      const winner = getSingleMatchWinner({ ...match3, completed: true });
      if (winner) {
        const nextMatch = bracket.find(m => m.id === match1.nextMatchId);
        if (nextMatch) {
          const pA = !nextMatch.playerA ? winner : nextMatch.playerA;
          const pB = nextMatch.playerA && !nextMatch.playerB ? winner : nextMatch.playerB;
          updateMatch(match1.nextMatchId, { playerA: pA, playerB: pB });
        }
      }
    }
  };

  return (
    <div className="space-y-8">
      {roundGroups.map((group, groupIdx) => {
        const roundName = getRoundName(groupIdx, roundGroups.length);
        return (
          <div key={groupIdx}>
            <h3 className="text-sm font-bold mb-4 uppercase tracking-wide" style={{ color: 'var(--gold)' }}>{roundName}</h3>
            <div className="space-y-6">
              {group.map((match1, matchIdx) => {
                const match2 = bracket.find(m => m.id === match1.bo3Match2Id);
                const match3 = bracket.find(m => m.id === match1.bo3Match3Id);
                const w1 = getSingleMatchWinner(match1);
                const w2 = match2 ? getSingleMatchWinner(match2) : null;
                const { winner, needsMatch3 } = getBo3Winner(bracket, match1);
                const showMatch3 = needsMatch3 || match3?.completed;

                // Score tracking
                const scoreA_wins = [w1, w2].filter(w => w === match1.playerA).length;
                const scoreB_wins = [w1, w2].filter(w => w === match1.playerB).length;

                return (
                  <div key={match1.id} className="p-4 rounded-lg space-y-4" style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${winner ? 'var(--gold)' : 'var(--border-color)'}` }}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                        Match {matchIdx + 1}: {match1.playerA || 'TBD'} vs {match1.playerB || 'TBD'}
                      </span>
                      {winner && <span className="text-xs font-bold" style={{ color: 'var(--gold)' }}>✓ {winner}</span>}
                    </div>

                    {/* Score summary */}
                    {match1.completed && (
                      <div className="flex justify-between items-center px-3 py-2 rounded text-sm font-semibold" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <span style={{ color: scoreA_wins > scoreB_wins ? 'var(--gold)' : 'var(--text-secondary)' }}>
                          {match1.playerA}: {scoreA_wins} 🏆
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>Score Bo3</span>
                        <span style={{ color: scoreB_wins > scoreA_wins ? 'var(--gold)' : 'var(--text-secondary)' }}>
                          {match1.playerB}: {scoreB_wins} 🏆
                        </span>
                      </div>
                    )}

                    {/* Match 1 */}
                    <div>
                      <div className="text-xs font-semibold mb-2" style={{ color: 'var(--gold)' }}>Match 1</div>
                      <SingleMatchEditor
                        match={match1}
                        onUpdate={(u) => updateMatch(match1.id, u)}
                        onToggleComplete={() => handleMatch1Complete(match1)}
                      />
                    </div>

                    {/* Match 2 */}
                    {match2 && (
                      <div>
                        <div className="text-xs font-semibold mb-2" style={{ color: 'var(--gold)' }}>Match 2</div>
                        <SingleMatchEditor
                          match={match2}
                          onUpdate={(u) => updateMatch(match2.id, u)}
                          onToggleComplete={() => handleMatch2Complete(match1, match2)}
                          disabled={!match1.completed}
                          disabledReason="Terminez d'abord le match 1"
                        />
                        {match1.completed && w1 && match2.completed && w1 === w2 && (
                          <div className="text-xs text-center mt-1 px-2 py-1 rounded" style={{ backgroundColor: 'var(--gold-light)', color: 'var(--gold)' }}>
                            ✓ {w1} gagne 2/2 — passe directement
                          </div>
                        )}
                        {match1.completed && match2.completed && w1 !== w2 && !winner && (
                          <div className="text-xs text-center mt-1 px-2 py-1 rounded" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                            1-1 → Match 3 requis!
                          </div>
                        )}
                      </div>
                    )}

                    {/* Match 3 */}
                    {(showMatch3 || needsMatch3) && match3 && (
                      <div>
                        <div className="text-xs font-semibold mb-2 flex items-center gap-1" style={{ color: '#ef4444' }}>
                          ⚡ Match 3 (1-1, départage)
                        </div>
                        <SingleMatchEditor
                          match={match3}
                          onUpdate={(u) => updateMatch(match3.id, u)}
                          onToggleComplete={() => handleMatch3Complete(match1, match3)}
                          disabled={!match2?.completed}
                          disabledReason="Terminez d'abord le match 2"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Shared Single Match Editor ───────────────────────────────────────────────
function SingleMatchEditor({
  match, onUpdate, onToggleComplete, disabled = false, disabledReason
}: {
  match: Match;
  onUpdate: (updates: Partial<Match>) => void;
  onToggleComplete: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <div className="space-y-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', border: `1px solid ${match.completed ? 'var(--gold)' : 'var(--border-color)'}`, opacity: disabled ? 0.5 : 1 }}>
      {/* Player A row */}
      <div className="flex items-center gap-3">
        <span className="flex-1 text-sm font-medium truncate">{match.playerA || 'TBD'}</span>
        <input
          type="number" min={0}
          value={match.scoreA[0] === 0 && !match.completed ? '' : match.scoreA[0]}
          placeholder="0"
          disabled={disabled || match.completed}
          onChange={(e) => onUpdate({ scoreA: [Math.max(0, parseInt(e.target.value) || 0), ...match.scoreA.slice(1)] })}
          className="w-14 rounded px-2 py-1 text-center font-bold text-sm"
          style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--gold)', cursor: disabled || match.completed ? 'not-allowed' : 'text' }}
        />
      </div>

      {/* Player B row */}
      <div className="flex items-center gap-3">
        <span className="flex-1 text-sm font-medium truncate">{match.playerB || 'TBD'}</span>
        <input
          type="number" min={0}
          value={match.scoreB[0] === 0 && !match.completed ? '' : match.scoreB[0]}
          placeholder="0"
          disabled={disabled || match.completed}
          onChange={(e) => onUpdate({ scoreB: [Math.max(0, parseInt(e.target.value) || 0), ...match.scoreB.slice(1)] })}
          className="w-14 rounded px-2 py-1 text-center font-bold text-sm"
          style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--gold)', cursor: disabled || match.completed ? 'not-allowed' : 'text' }}
        />
      </div>

      {/* Validation: no draw allowed */}
      {!match.completed && !disabled && match.scoreA[0] === match.scoreB[0] && match.scoreA[0] > 0 && (
        <div className="text-xs text-center" style={{ color: '#ef4444' }}>
          ⚠️ Égalité non autorisée — un gagnant est obligatoire
        </div>
      )}

      {/* Stream link */}
      <input
        type="text"
        value={match.streamLink || ''}
        onChange={(e) => onUpdate({ streamLink: e.target.value })}
        placeholder="Lien stream (optionnel)"
        disabled={disabled}
        className="w-full rounded px-2 py-1 text-xs"
        style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: disabled ? 'not-allowed' : 'text' }}
      />

      {/* Complete button */}
      {disabled ? (
        <div className="text-xs text-center py-1" style={{ color: 'var(--text-secondary)' }}>
          {disabledReason}
        </div>
      ) : (
        <button
          onClick={() => {
            // Prevent completing with a draw
            if (!match.completed && match.scoreA[0] === match.scoreB[0]) {
              alert('Un match ne peut pas se terminer sur un score nul. Entrez un gagnant clair.');
              return;
            }
            onToggleComplete();
          }}
          className="w-full py-1.5 rounded text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          style={{
            backgroundColor: match.completed ? '#16a34a' : 'var(--bg-primary)',
            color: match.completed ? 'white' : 'var(--text-primary)',
            border: `1px solid ${match.completed ? '#16a34a' : 'var(--border-color)'}`,
          }}>
          <Check size={14} />
          {match.completed ? 'Marquer Incomplet' : 'Marquer Terminé'}
        </button>
      )}
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
  const [runnerUp, setRunnerUp] = useState('');

  useEffect(() => {
    db.loadActiveTournament().then((t) => {
      setTournament(t);
      setLoading(false);
    });
  }, []);

  const getDetectedWinner = () => {
    if (!tournament) return null;
    // For Single Elimination: last non-barrage match
    const finalMatch = tournament.bracket.find(m => !m.nextMatchId && !m.isBarrage);
    if (!finalMatch || !finalMatch.completed) return null;
    return getSingleMatchWinner(finalMatch);
  };

  const getDetectedRunnerUp = () => {
    if (!tournament) return null;
    const finalMatch = tournament.bracket.find(m => !m.nextMatchId && !m.isBarrage);
    if (!finalMatch || !finalMatch.completed) return null;
    const w = getSingleMatchWinner(finalMatch);
    if (!w) return null;
    return w === finalMatch.playerA ? finalMatch.playerB : finalMatch.playerA;
  };

  const handleFinish = async () => {
    if (!tournament) return;
    const finalWinner = winner || getDetectedWinner();
    const finalRunnerUp = runnerUp || getDetectedRunnerUp();
    if (!finalWinner) { alert('No winner detected. Make sure the final match is completed.'); return; }
    if (!confirm(`Finish tournament and declare "${finalWinner}" as winner?`)) return;

    setFinishing(true);
    try {
      const updated = { ...tournament, winner: finalWinner, runner_up: finalRunnerUp || undefined };
      await db.updateCurrentTournament(updated);
      await db.finalizeTournament(updated);
      await db.incrementPlayerWins(finalWinner);
      if (finalRunnerUp) await db.incrementPlayerFinals(finalRunnerUp);
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
  const detectedRunnerUp = getDetectedRunnerUp();
  const completedMatches = tournament.bracket.filter(m => m.completed).length;
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
        <div className="p-4 rounded-lg space-y-2" style={{ backgroundColor: 'var(--gold-light)', border: '1px solid var(--gold)' }}>
          <div className="text-center">
            <Trophy size={32} className="mx-auto mb-2" style={{ color: 'var(--gold)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Gagnant détecté</p>
            <p className="text-xl font-bold" style={{ color: 'var(--gold)' }}>{detectedWinner}</p>
          </div>
          {detectedRunnerUp && (
            <div className="text-center">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Runner-up: <strong>{detectedRunnerUp}</strong></p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold mb-2">Override Winner Name</label>
            <input type="text" value={winner} onChange={(e) => setWinner(e.target.value)}
              placeholder="Enter winner name manually"
              className="w-full rounded px-3 py-2 text-sm"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Runner-up Name</label>
            <input type="text" value={runnerUp} onChange={(e) => setRunnerUp(e.target.value)}
              placeholder="Enter runner-up name manually"
              className="w-full rounded px-3 py-2 text-sm"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
          </div>
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('historical_tournaments')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setTournaments(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" from history?`)) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from('historical_tournaments').delete().eq('id', id);
      if (error) throw error;
      setTournaments(prev => prev.filter(t => t.id !== id));
    } catch {
      alert('Error deleting tournament');
    } finally {
      setDeletingId(null);
    }
  };

  const handleResetAll = async () => {
    if (!confirm('Delete ALL historical tournaments?')) return;
    setResetting(true);
    try {
      const { error } = await supabase.from('historical_tournaments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      setTournaments([]);
    } catch {
      alert('Error resetting history');
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading history...</div>;

  return (
    <div className="space-y-4">
      {tournaments.length > 0 && (
        <div className="flex justify-end">
          <button onClick={handleResetAll} disabled={resetting}
            className="flex items-center gap-2 px-4 py-2 rounded font-semibold text-sm"
            style={{ backgroundColor: '#dc2626', color: 'white', cursor: resetting ? 'not-allowed' : 'pointer', opacity: resetting ? 0.7 : 1 }}>
            <Trash2 size={14} />
            {resetting ? 'Resetting...' : 'Reset All History'}
          </button>
        </div>
      )}

      {tournaments.length === 0 ? (
        <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
          No finished tournaments yet.
        </div>
      ) : (
        tournaments.map(t => (
          <div key={t.id} className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {t.format} · {t.size} players
                  {t.date && ` · ${new Date(t.date).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <History size={16} style={{ color: 'var(--text-secondary)' }} />
                <button onClick={() => handleDelete(t.id, t.name)} disabled={deletingId === t.id}
                  className="p-1.5 rounded"
                  style={{ backgroundColor: '#dc2626', color: 'white', cursor: deletingId === t.id ? 'not-allowed' : 'pointer', opacity: deletingId === t.id ? 0.7 : 1 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {t.winner && (
              <div className="flex items-center gap-2 mt-3" style={{ color: 'var(--gold)' }}>
                <Trophy size={16} />
                <span className="font-semibold text-sm">{t.winner}</span>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Winner</span>
              </div>
            )}
            {t.runner_up && (
              <div className="flex items-center gap-2 mt-1" style={{ color: 'var(--text-secondary)' }}>
                <span>🥈</span>
                <span className="font-semibold text-sm">{t.runner_up}</span>
                <span className="text-xs">Runner-up</span>
              </div>
            )}
            <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
              {t.bracket?.filter((m: any) => m.completed).length ?? 0}/{t.bracket?.length ?? 0} matches played
            </p>
          </div>
        ))
      )}
    </div>
  );
}