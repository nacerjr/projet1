'use client';

import { Tournament, Match } from '@/lib/storage';

interface BracketViewProps {
  tournament: Tournament;
}

export default function BracketView({ tournament }: BracketViewProps) {
  // Group matches by round
  const matchesByRound = tournament.bracket.reduce(
    (acc, match) => {
      if (!acc[match.round]) {
        acc[match.round] = [];
      }
      acc[match.round].push(match);
      return acc;
    },
    {} as Record<number, Match[]>
  );

  const sortedRounds = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => a - b);

  const getWinner = (match: Match) => {
    // Check for TBD bye: ONLY applies to Round 1
    if (match.round === 1) {
      const isByeMatch = (match.playerA === null || match.playerA === '') && 
                         (match.playerB !== null && match.playerB !== '');
      const isByeMatchReverse = (match.playerB === null || match.playerB === '') && 
                                (match.playerA !== null && match.playerA !== '');

      if (isByeMatch) {
        return match.playerB;
      }
      if (isByeMatchReverse) {
        return match.playerA;
      }
    }

    if (!match.completed) return null;

    if (tournament.format === 'Single Elimination' || tournament.format === 'Élimination directe') {
      return match.scoreA[0] > match.scoreB[0] ? match.playerA : match.playerB;
    } else if (tournament.format === 'Two-Leg' || tournament.format === 'Aller-retour') {
      const totalA = match.scoreA[0] + match.scoreA[1];
      const totalB = match.scoreB[0] + match.scoreB[1];
      return totalA > totalB ? match.playerA : match.playerB;
    } else if (tournament.format === 'Best of 3') {
      let winsA = 0;
      let winsB = 0;
      for (let i = 0; i < 3; i++) {
        if (match.scoreA[i] > match.scoreB[i]) winsA++;
        if (match.scoreB[i] > match.scoreA[i]) winsB++;
      }
      return winsA > winsB ? match.playerA : match.playerB;
    }

    return null;
  };

  const isByeMatch = (match: Match) => {
    // BYE only applies to Round 1
    if (match.round !== 1) return false;
    const aEmpty = match.playerA === null || match.playerA === '';
    const bEmpty = match.playerB === null || match.playerB === '';
    return (aEmpty && !bEmpty) || (!aEmpty && bEmpty);
  };

  const getRoundName = (roundNumber: number) => {
    const matchesInRound = matchesByRound[roundNumber];
    if (!matchesInRound) return `Round ${roundNumber}`;
    
    // Count real players (not TBD) in the next round after this one
    const nextRound = matchesByRound[roundNumber + 1];
    if (!nextRound) {
      // This is the final round, count winners of this round
      const remainingPlayers = matchesInRound.length * 2;
      if (remainingPlayers === 2) return 'Final';
    }
    
    const remainingPlayers = matchesInRound.length * 2;
    if (remainingPlayers === 2) return 'Final';
    if (remainingPlayers === 4) return 'Semi-Final';
    if (remainingPlayers === 8) return 'Quarter-Final';
    if (remainingPlayers === 16) return 'Round of 16';
    if (remainingPlayers === 32) return 'Round of 32';
    if (remainingPlayers === 64) return 'Round of 64';
    if (remainingPlayers === 128) return 'Round of 128';
    if (remainingPlayers === 256) return 'Round of 256';
    
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
                <div
                  key={match.id}
                  className="rounded-lg p-3 space-y-2"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
                >
                  <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Match {matchesByRound[round].indexOf(match) + 1}
                  </div>

                  {/* Player A */}
                  <div
                    className="flex justify-between items-center py-2 px-3 rounded"
                    style={{
                      backgroundColor: winner === match.playerA ? 'var(--gold-light)' : 'transparent',
                      borderLeft: winner === match.playerA ? `2px solid var(--gold)` : 'none',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <span className="text-sm">
                      {match.playerA || 'TBD'}
                    </span>
                    <div className="flex gap-1 items-center">
                      {isByeMatch(match) && !match.playerA ? (
                        <span className="text-xs italic" style={{ color: 'var(--text-secondary)' }}>BYE</span>
                      ) : (
                        <>
                          {(tournament.format === 'Single Elimination' || tournament.format === 'Élimination directe') && (
                            <span className="font-mono font-bold" style={{ color: 'var(--gold)' }}>
                              {match.scoreA[0] || '-'}
                            </span>
                          )}
                          {(tournament.format === 'Two-Leg' || tournament.format === 'Aller-retour') && (
                            <>
                              <span className="font-mono text-xs" style={{ color: 'var(--gold)' }}>
                                {match.scoreA[0] || '-'}
                              </span>
                              <span style={{ color: 'var(--text-secondary)' }}>-</span>
                              <span className="font-mono text-xs" style={{ color: 'var(--gold)' }}>
                                {match.scoreA[1] || '-'}
                              </span>
                            </>
                          )}
                          {tournament.format === 'Best of 3' && (
                            <>
                              {match.scoreA.map((score, i) => {
                                // Only show games 1 and 2, and game 3 if each player has exactly 1 win
                                if (i > 1) {
                                  const game1WonByA = match.scoreA[0] > match.scoreB[0];
                                  const game2WonByA = match.scoreA[1] > match.scoreB[1];
                                  const game1WonByB = match.scoreB[0] > match.scoreA[0];
                                  const game2WonByB = match.scoreB[1] > match.scoreA[1];
                                  
                                  // Show game 3 only if each won exactly one game
                                  if (!((game1WonByA && game2WonByB) || (game1WonByB && game2WonByA))) {
                                    return null;
                                  }
                                }
                                return (
                                  <span
                                    key={i}
                                    className="text-[#FFD700] font-mono text-xs"
                                  >
                                    {score || '-'}
                                  </span>
                                );
                              })}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Player B */}
                  <div
                    className="flex justify-between items-center py-2 px-3 rounded"
                    style={{
                      backgroundColor: winner === match.playerB ? 'var(--gold-light)' : 'transparent',
                      borderLeft: winner === match.playerB ? `2px solid var(--gold)` : 'none',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <span className="text-sm">
                      {match.playerB || 'TBD'}
                    </span>
                    <div className="flex gap-1 items-center">
                      {isByeMatch(match) && !match.playerB ? (
                        <span className="text-xs italic" style={{ color: 'var(--text-secondary)' }}>BYE</span>
                      ) : (
                        <>
                          {(tournament.format === 'Single Elimination' || tournament.format === 'Élimination directe') && (
                            <span className="text-[#FFD700] font-mono font-bold">
                              {match.scoreB[0] || '-'}
                            </span>
                          )}
                          {(tournament.format === 'Two-Leg' || tournament.format === 'Aller-retour') && (
                            <>
                              <span className="font-mono text-xs" style={{ color: 'var(--gold)' }}>
                                {match.scoreB[0] || '-'}
                              </span>
                              <span style={{ color: 'var(--text-secondary)' }}>-</span>
                              <span className="font-mono text-xs" style={{ color: 'var(--gold)' }}>
                                {match.scoreB[1] || '-'}
                              </span>
                            </>
                          )}
                          {tournament.format === 'Best of 3' && (
                            <>
                              {match.scoreB.map((score, i) => {
                                // Only show games 1 and 2, and game 3 if each player has exactly 1 win
                                if (i > 1) {
                                  const game1WonByA = match.scoreA[0] > match.scoreB[0];
                                  const game2WonByA = match.scoreA[1] > match.scoreB[1];
                                  const game1WonByB = match.scoreB[0] > match.scoreA[0];
                                  const game2WonByB = match.scoreB[1] > match.scoreA[1];
                                  
                                  // Show game 3 only if each won exactly one game
                                  if (!((game1WonByA && game2WonByB) || (game1WonByB && game2WonByA))) {
                                    return null;
                                  }
                                }
                                return (
                                  <span
                                    key={i}
                                    className="font-mono text-xs"
                                    style={{ color: 'var(--gold)' }}
                                  >
                                    {score || '-'}
                                  </span>
                                );
                              })}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-1">
                    {(match.completed || isByeMatch(match)) && (
                      <div className="text-xs text-center" style={{ color: 'var(--gold)' }}>
                        ✓ Completed
                      </div>
                    )}
                    {match.streamLink && (
                      <a
                        href={match.streamLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-2 py-1 rounded"
                        style={{ backgroundColor: 'var(--gold)', color: 'var(--bg-primary)', textDecoration: 'none', fontWeight: 'bold' }}
                      >
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
