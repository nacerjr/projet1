'use client';

import { useState } from 'react';
import { Tournament } from '@/lib/db';
import BracketView from './BracketView';
import { ChevronDown } from 'lucide-react';

interface HistoricalTournamentsProps {
  tournaments: Tournament[];
}

export default function HistoricalTournaments({ tournaments }: HistoricalTournamentsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {tournaments.map((tournament) => (
        <div key={tournament.id} className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setExpandedId(expandedId === tournament.id ? null : tournament.id!)}
            className="w-full px-4 py-3 flex justify-between items-center transition-colors"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <div className="text-left">
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{tournament.name}</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {tournament.date && new Date(tournament.date).toLocaleDateString()}
                {tournament.winner && ` • Winner: ${tournament.winner}`}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                {tournament.format} • {tournament.size} players
              </p>
            </div>
            <ChevronDown
              size={20}
              className={`transition-transform ${expandedId === tournament.id ? 'rotate-180' : ''}`}
              style={{ color: 'var(--gold)' }}
            />
          </button>
          {expandedId === tournament.id && (
            <div className="px-4 py-4" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
              <BracketView tournament={tournament} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}