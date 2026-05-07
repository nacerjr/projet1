'use client';

import { Tournament, Match } from '@/lib/db';

interface BracketViewProps {
  tournament: Tournament;
}

export default function BracketView({ tournament }: BracketViewProps) {
  const matchesByRound = tournament.bracket.reduce(
    (acc, match) => {
      if (!acc[match.round]) acc[match.round] = [];
      acc[match.round].push(match);
      return acc;
    },
    {} as Record<number, Match[]>
  );

  const sortedRounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);

  const getWinner = (match: Match) => {
    if (match.round === 1) {
      const isByeA = (match.playerA === null || match.playerA === '') && (match.playerB !== null && match.playerB !== '');
      const isByeB = (match.playerB === null || match.playerB === '') && (match.playerA !== null && match.playerA !== '');
      if (isByeA) return match.playerB;
      if (isByeB) return match.playerA;
    }
    if (!match.completed) return null;
    return match.scoreA[0] > match.scoreB[0] ? match.playerA : match.playerB;
  };

  const isByeMatch = (match: Match) => {
    if (match.round !== 1) return false;
    const aEmpty = match.playerA === null || match.playerA === '';
    const bEmpty = match.playerB === null || match.playerB === '';
    return (aEmpty && !bEmpty) || (!aEmpty && bEmpty);
  };

  const getRoundName = (roundNumber: number) => {
    const matchesInRound = matchesByRound[roundNumber];
    if (!matchesInRound) return `Round ${roundNumber}`;
    const remainingPlayers = matchesInRound.length * 2;
    if (remainingPlayers === 2) return 'Final';
    if (remainingPlayers === 4) return 'Semi-Final';
    if (remainingPlayers === 8) return 'Quarter-Final';
    if (remainingPlayers === 16) return 'Round of 16';
    if (remainingPlayers === 32) return 'Round of 32';
    if (remainingPlayers === 64) return 'Round of 64';
    return `Round ${roundNumber}`;
  };

  return (
    <div className="space-y-6 overflow-x-auto pb-4">
      {sortedRounds.map((round) => (
        <div key={round} className="min-w-full">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--gold)' }}>
            {getRoundName(round)}
          </h3>
          <div className="space-y-3">
            {matchesByRound[round].map((match) => {
              const winner = getWinner(match);
              return (
                <div key={match.id} className="rounded-lg p-3 space-y-2" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Match {matchesByRound[round].indexOf(match) + 1}
                  </div>
                  {[{ player: match.playerA, score: match.scoreA, isA: true }, { player: match.playerB, score: match.scoreB, isA: false }].map(({ player, score, isA }) => (
                    <div
                      key={isA ? 'a' : 'b'}
                      className="flex justify-between items-center py-2 px-3 rounded"
                      style={{
                        backgroundColor: winner === player ? 'var(--gold-light)' : 'transparent',
                        borderLeft: winner === player ? '2px solid var(--gold)' : 'none',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <span className="text-sm">{player || 'TBD'}</span>
                      <div className="flex gap-1 items-center">
                        {isByeMatch(match) && !player ? (
                          <span className="text-xs italic" style={{ color: 'var(--text-secondary)' }}>BYE</span>
                        ) : (
                          <span className="font-mono font-bold" style={{ color: 'var(--gold)' }}>
                            {score[0] ?? '-'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-center gap-2 pt-1">
                    {(match.completed || isByeMatch(match)) && (
                      <div className="text-xs text-center" style={{ color: 'var(--gold)' }}>✓ Completed</div>
                    )}
                    {match.streamLink && (
                      <a href={match.streamLink} target="_blank" rel="noopener noreferrer"
                        className="text-xs px-2 py-1 rounded"
                        style={{ backgroundColor: 'var(--gold)', color: 'var(--bg-primary)', textDecoration: 'none', fontWeight: 'bold' }}>
                        ▶ Watch
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}