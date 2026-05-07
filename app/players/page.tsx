'use client';

import { useEffect, useState } from 'react';
import { loadPlayers, loadHistoricalTournaments } from '@/lib/db';
import { Player, Tournament } from '@/lib/db';
import BottomNav from '@/components/BottomNav';
import { ThemeToggle } from '@/components/ThemeProvider';
import { Trophy, Award } from 'lucide-react';

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [historicalTournaments, setHistoricalTournaments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ranking' | 'editions'>('ranking');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [playersData, historicalData] = await Promise.all([
        loadPlayers(),
        loadHistoricalTournaments(),
      ]);
      setPlayers(playersData);
      setHistoricalTournaments(historicalData);
      setMounted(true);
    };
    load();
  }, []);

  if (!mounted) return null;

  // Show any player who has at least 1 trophy OR 1 final appearance
  const sortedPlayers = [...players]
    .filter((p) => p.trophies > 0 || p.second_place > 0)
    .sort((a, b) => {
      if (b.trophies !== a.trophies) return b.trophies - a.trophies;
      return b.second_place - a.second_place;
    });

  return (
    <main className="min-h-screen pb-24 max-w-md mx-auto" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="pt-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--gold)' }}>Players</h1>
          <ThemeToggle />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setActiveTab('ranking')}
            className={`pb-3 px-2 font-semibold transition-colors ${activeTab === 'ranking' ? 'border-b-2' : ''}`}
            style={{
              color: activeTab === 'ranking' ? 'var(--gold)' : 'var(--text-secondary)',
              borderBottomColor: 'var(--gold)'
            }}
          >
            Rankings
          </button>
          <button
            onClick={() => setActiveTab('editions')}
            className={`pb-3 px-2 font-semibold transition-colors ${activeTab === 'editions' ? 'border-b-2' : ''}`}
            style={{
              color: activeTab === 'editions' ? 'var(--gold)' : 'var(--text-secondary)',
              borderBottomColor: 'var(--gold)'
            }}
          >
            Editions
          </button>
        </div>

        {/* Ranking Tab */}
        {activeTab === 'ranking' && (
          <div className="space-y-3">
            {sortedPlayers.length === 0 ? (
              <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                No winners yet
              </p>
            ) : (
              sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className="rounded-lg p-4 flex items-center gap-4"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
                >
                  <div className="text-2xl font-bold min-w-8" style={{ color: 'var(--gold)' }}>
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{player.name}</p>
                  </div>
                  <div className="flex gap-4 text-right">
                    <div className="flex flex-col items-center">
                      <Trophy size={18} className="mb-1" style={{ color: 'var(--gold)' }} />
                      <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>
                        {player.trophies}
                      </span>
                      <span className="text-xs">🏆</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Award size={18} className="mb-1" style={{ color: 'var(--text-secondary)' }} />
                      <span className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                        {player.second_place}
                      </span>
                      <span className="text-xs">🥈</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Editions Tab */}
        {activeTab === 'editions' && (
          <div className="space-y-3">
            {historicalTournaments.length === 0 ? (
              <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                No editions recorded
              </p>
            ) : (
              historicalTournaments.map((tournament) => (
                <div
                  key={tournament.id}
                  className="rounded-lg p-4"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
                >
                  <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    {tournament.name}
                  </p>
                  <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                    {tournament.format} · {tournament.size} players
                    {tournament.date && ` · ${new Date(tournament.date).toLocaleDateString()}`}
                  </p>

                  {/* Winner */}
                  {tournament.winner && (
                    <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--gold)' }}>
                      <Trophy size={16} />
                      <span className="text-sm font-bold">{tournament.winner}</span>
                      <span className="text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>Winner</span>
                    </div>
                  )}

                  {/* Runner-up */}
                  {tournament.runner_up && (
                    <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                      <span className="text-base">🥈</span>
                      <span className="text-sm font-semibold">{tournament.runner_up}</span>
                      <span className="text-xs">Runner-up</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}