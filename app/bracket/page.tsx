'use client';

import { useEffect, useState } from 'react';
import { loadActiveTournament, loadHistoricalTournaments } from '@/lib/db';
import { Tournament } from '@/lib/db';
import BottomNav from '@/components/BottomNav';
import BracketView from '@/components/BracketView';
import HistoricalTournaments from '@/components/HistoricalTournaments';
import ExportBracket from '@/components/ExportBracket';
import { ThemeToggle } from '@/components/ThemeProvider';
import { Clock } from 'lucide-react';

export default function BracketPage() {
  const [currentTournament, setCurrentTournament] = useState<Tournament | null>(null);
  const [historicalTournaments, setHistoricalTournaments] = useState<Tournament[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [active, historical] = await Promise.all([
        loadActiveTournament(),
        loadHistoricalTournaments(),
      ]);
      setCurrentTournament(active);
      setHistoricalTournaments(historical);
      setMounted(true);
    };
    load();
  }, []);

  if (!mounted) return null;

  const scrollToHistory = () => {
    const historySection = document.getElementById('history-section');
    if (historySection) {
      historySection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <main className="min-h-screen pb-24 max-w-md mx-auto" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="pt-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--gold)' }}>Bracket</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {currentTournament && <ExportBracket tournament={currentTournament} />}
            {historicalTournaments.length > 0 && (
              <button
                onClick={scrollToHistory}
                className="flex items-center gap-2 px-3 py-2 rounded transition-colors text-sm"
                style={{
                  borderColor: 'var(--gold)',
                  color: 'var(--gold)',
                  backgroundColor: 'var(--gold-light)',
                  border: `1px solid var(--gold)`
                }}
              >
                <Clock size={16} />
                History
              </button>
            )}
          </div>
        </div>

        {!currentTournament ? (
          <div className="flex items-center justify-center min-h-96">
            <p className="text-center" style={{ color: 'var(--text-secondary)' }}>No tournament configured</p>
          </div>
        ) : (
          <BracketView tournament={currentTournament} />
        )}

        {historicalTournaments.length > 0 && (
          <div id="history-section" className="mt-12 space-y-4">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--gold)' }}>History</h2>
            <HistoricalTournaments tournaments={historicalTournaments} />
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}