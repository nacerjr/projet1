'use client';

import { Tournament, Match } from '@/lib/db';

interface BracketViewProps {
  tournament: Tournament;
}

export default function BracketView({ tournament }: BracketViewProps) {
  const format = tournament.format;

  if (format === 'Single Elimination') {
    return <SingleElimView tournament={tournament} />;
  }
  if (format === 'Double Elimination') {
    return <DoubleElimView tournament={tournament} />;
  }
  if (format === 'Best of 3') {
    return <BestOf3View tournament={tournament} />;
  }

  return null;
}

// ─── Stream Link Button (public view) ───────────────────────────────────────
function StreamButton({ link }: { link: string }) {
  if (!link) return null;
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded font-bold mt-1"
      style={{ backgroundColor: '#ef4444', color: 'white', textDecoration: 'none' }}
    >
      🔴 Watch Live
    </a>
  );
}

// ─── Single Elimination View ─────────────────────────────────────────────────
function SingleElimView({ tournament }: { tournament: Tournament }) {
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
            {matchesByRound[round].map((match, idx) => {
              const winner = getWinner(match);
              return (
                <div key={match.id} className="rounded-lg p-3 space-y-2"
                  style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${match.completed ? 'var(--gold)' : 'var(--border-color)'}` }}>
                  <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Match {idx + 1}
                  </div>
                  {[
                    { player: match.playerA, score: match.scoreA, isA: true },
                    { player: match.playerB, score: match.scoreB, isA: false },
                  ].map(({ player, score, isA }) => (
                    <div
                      key={isA ? 'a' : 'b'}
                      className="flex justify-between items-center py-2 px-3 rounded"
                      style={{
                        backgroundColor: winner === player && player ? 'var(--gold-light)' : 'transparent',
                        borderLeft: winner === player && player ? '2px solid var(--gold)' : 'none',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <span className="text-sm font-medium">{player || 'TBD'}</span>
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
                  <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                    {(match.completed || isByeMatch(match)) && (
                      <div className="text-xs" style={{ color: 'var(--gold)' }}>✓ Terminé</div>
                    )}
                    {match.streamLink && <StreamButton link={match.streamLink} />}
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

// ─── Double Elimination View ─────────────────────────────────────────────────
function DoubleElimView({ tournament }: { tournament: Tournament }) {
  const bracket = tournament.bracket;

  const allerMatches = bracket.filter(m => m.matchType === 'aller').sort((a, b) => a.round - b.round);

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

  const getAggregateWinner = (allerMatch: Match) => {
    const retourMatch = bracket.find(m => m.id === allerMatch.retourMatchId);
    const barrageMatch = bracket.find(m => m.id === allerMatch.barrageMatchId);

    if (barrageMatch?.completed) {
      return barrageMatch.scoreA[0] > barrageMatch.scoreB[0]
        ? barrageMatch.playerA
        : barrageMatch.playerB;
    }

    if (!allerMatch.completed || !retourMatch?.completed) return null;
    const aggA = allerMatch.scoreA[0] + retourMatch.scoreA[0];
    const aggB = allerMatch.scoreB[0] + retourMatch.scoreB[0];
    if (aggA > aggB) return allerMatch.playerA;
    if (aggB > aggA) return allerMatch.playerB;
    return null;
  };

  return (
    <div className="space-y-6 overflow-x-auto pb-4">
      {roundGroups.map((allerGroup, groupIdx) => {
        const roundName = getRoundName(groupIdx, roundGroups.length);
        return (
          <div key={groupIdx} className="min-w-full">
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--gold)' }}>
              {roundName}
            </h3>
            <div className="space-y-3">
              {allerGroup.map((allerMatch, matchIdx) => {
                const retourMatch = bracket.find(m => m.id === allerMatch.retourMatchId);
                const barrageMatch = bracket.find(m => m.id === allerMatch.barrageMatchId);
                const winner = getAggregateWinner(allerMatch);

                const aggA = (allerMatch.scoreA[0] || 0) + (retourMatch?.scoreA[0] || 0);
                const aggB = (allerMatch.scoreB[0] || 0) + (retourMatch?.scoreB[0] || 0);
                const isBarrageNeeded = allerMatch.completed && retourMatch?.completed && aggA === aggB && !barrageMatch?.completed;
                const showBarrage = isBarrageNeeded || !!barrageMatch?.completed || !!barrageMatch?.barrageNeeded;

                const cardDone = !!winner;

                // FIX: Pour le retour, les joueurs sont TOUJOURS les mêmes que l'aller.
                // On utilise allerMatch.playerA/B comme fallback si retourMatch.playerA/B est null.
                const retourPlayerA = retourMatch?.playerA ?? allerMatch.playerA;
                const retourPlayerB = retourMatch?.playerB ?? allerMatch.playerB;

                return (
                  <div key={allerMatch.id} className="rounded-lg p-3 space-y-2"
                    style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${cardDone ? 'var(--gold)' : 'var(--border-color)'}` }}>

                    {/* Match header */}
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        Match {matchIdx + 1} — <span style={{ color: 'var(--text-primary)' }}>{allerMatch.playerA || 'TBD'}</span>
                        <span style={{ color: 'var(--text-secondary)' }}> vs </span>
                        <span style={{ color: 'var(--text-primary)' }}>{allerMatch.playerB || 'TBD'}</span>
                      </span>
                      {winner && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded"
                          style={{ backgroundColor: 'var(--gold-light)', color: 'var(--gold)' }}>
                          ✓ {winner}
                        </span>
                      )}
                    </div>

                    {/* Aller sub-row */}
                    <MatchLegRow
                      label="Aller"
                      playerA={allerMatch.playerA}
                      playerB={allerMatch.playerB}
                      scoreA={allerMatch.scoreA[0]}
                      scoreB={allerMatch.scoreB[0]}
                      completed={allerMatch.completed}
                      highlightWinner={false}
                    />
                    {allerMatch.streamLink && <StreamButton link={allerMatch.streamLink} />}

                    {/* Retour sub-row — FIX: toujours afficher les joueurs de l'aller */}
                    {retourMatch && (
                      <>
                        <MatchLegRow
                          label="Retour"
                          playerA={retourPlayerA}
                          playerB={retourPlayerB}
                          scoreA={retourMatch.scoreA[0]}
                          scoreB={retourMatch.scoreB[0]}
                          completed={retourMatch.completed}
                          highlightWinner={false}
                          dimmed={!allerMatch.completed}
                        />
                        {retourMatch.streamLink && <StreamButton link={retourMatch.streamLink} />}
                      </>
                    )}

                    {/* Aggregate */}
                    {allerMatch.completed && retourMatch?.completed && (
                      <div className="flex justify-between items-center px-2 py-1.5 rounded text-xs font-bold"
                        style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <span style={{ color: aggA > aggB ? 'var(--gold)' : 'var(--text-secondary)' }}>
                          {allerMatch.playerA || 'TBD'}: {aggA}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>Agrégat</span>
                        <span style={{ color: aggB > aggA ? 'var(--gold)' : 'var(--text-secondary)' }}>
                          {allerMatch.playerB || 'TBD'}: {aggB}
                        </span>
                      </div>
                    )}

                    {/* Barrage */}
                    {showBarrage && barrageMatch && (
                      <>
                        <MatchLegRow
                          label="⚡ Barrage"
                          playerA={barrageMatch.playerA ?? allerMatch.playerA}
                          playerB={barrageMatch.playerB ?? allerMatch.playerB}
                          scoreA={barrageMatch.scoreA[0]}
                          scoreB={barrageMatch.scoreB[0]}
                          completed={barrageMatch.completed}
                          highlightWinner={true}
                          dimmed={!retourMatch?.completed}
                          isBarrage
                        />
                        {barrageMatch.streamLink && <StreamButton link={barrageMatch.streamLink} />}
                      </>
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

// ─── Best of 3 View ──────────────────────────────────────────────────────────
function BestOf3View({ tournament }: { tournament: Tournament }) {
  const bracket = tournament.bracket;
  const match1s = bracket.filter(m => m.matchType === 'bo3_match1').sort((a, b) => a.round - b.round);

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

  const getMatchWinner = (match: Match | undefined) => {
    if (!match?.completed) return null;
    return match.scoreA[0] > match.scoreB[0] ? match.playerA : match.playerB;
  };

  const getBo3SeriesWinner = (match1: Match) => {
    const match2 = bracket.find(m => m.id === match1.bo3Match2Id);
    const match3 = bracket.find(m => m.id === match1.bo3Match3Id);

    const w1 = getMatchWinner(match1);
    const w2 = getMatchWinner(match2);

    if (w1 && w2) {
      if (w1 === w2) return w1;
      const w3 = getMatchWinner(match3);
      return w3;
    }
    return null;
  };

  return (
    <div className="space-y-6 overflow-x-auto pb-4">
      {roundGroups.map((group, groupIdx) => {
        const roundName = getRoundName(groupIdx, roundGroups.length);
        return (
          <div key={groupIdx} className="min-w-full">
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--gold)' }}>
              {roundName}
            </h3>
            <div className="space-y-3">
              {group.map((match1, matchIdx) => {
                const match2 = bracket.find(m => m.id === match1.bo3Match2Id);
                const match3 = bracket.find(m => m.id === match1.bo3Match3Id);
                const seriesWinner = getBo3SeriesWinner(match1);

                const w1 = getMatchWinner(match1);
                const w2 = getMatchWinner(match2);
                const winsA = [w1, w2].filter(w => w === match1.playerA).length;
                const winsB = [w1, w2].filter(w => w === match1.playerB).length;

                // FIX: Match 3 est toujours entre les mêmes joueurs — on ne dépend plus de match3.playerA
                // On affiche dès que match1 et match2 sont complétés et que les gagnants diffèrent (1-1)
                const is11 = match1.completed && match2?.completed && w1 && w2 && w1 !== w2;
                const showMatch3 = is11 || !!match3?.completed;

                // FIX: Pour match2 et match3, les joueurs sont TOUJOURS ceux de match1
                const p1A = match1.playerA;
                const p1B = match1.playerB;

                return (
                  <div key={match1.id} className="rounded-lg p-3 space-y-2"
                    style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${seriesWinner ? 'var(--gold)' : 'var(--border-color)'}` }}>

                    {/* Header */}
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        Match {matchIdx + 1} — <span style={{ color: 'var(--text-primary)' }}>{p1A || 'TBD'}</span>
                        <span style={{ color: 'var(--text-secondary)' }}> vs </span>
                        <span style={{ color: 'var(--text-primary)' }}>{p1B || 'TBD'}</span>
                      </span>
                      {seriesWinner ? (
                        <span className="text-xs font-bold px-2 py-0.5 rounded"
                          style={{ backgroundColor: 'var(--gold-light)', color: 'var(--gold)' }}>
                          ✓ {seriesWinner}
                        </span>
                      ) : match1.completed && match2?.completed ? (
                        <span className="text-xs px-2 py-0.5 rounded"
                          style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                          {winsA}-{winsB}
                        </span>
                      ) : null}
                    </div>

                    {/* Match 1 */}
                    <MatchLegRow
                      label="Match 1"
                      playerA={p1A}
                      playerB={p1B}
                      scoreA={match1.scoreA[0]}
                      scoreB={match1.scoreB[0]}
                      completed={match1.completed}
                      highlightWinner={true}
                    />
                    {match1.streamLink && <StreamButton link={match1.streamLink} />}

                    {/* Match 2 — FIX: toujours afficher p1A/p1B même si match2.playerA est null */}
                    {match2 && (
                      <>
                        <MatchLegRow
                          label="Match 2"
                          playerA={match2.playerA ?? p1A}
                          playerB={match2.playerB ?? p1B}
                          scoreA={match2.scoreA[0]}
                          scoreB={match2.scoreB[0]}
                          completed={match2.completed}
                          highlightWinner={true}
                          dimmed={!match1.completed}
                        />
                        {match2.streamLink && <StreamButton link={match2.streamLink} />}
                      </>
                    )}

                    {/* Match 3 — FIX: toujours p1A/p1B, visible dès 1-1 */}
                    {showMatch3 && match3 && (
                      <>
                        <MatchLegRow
                          label="⚡ Match 3"
                          playerA={match3.playerA ?? p1A}
                          playerB={match3.playerB ?? p1B}
                          scoreA={match3.scoreA[0]}
                          scoreB={match3.scoreB[0]}
                          completed={match3.completed}
                          highlightWinner={true}
                          dimmed={!match2?.completed}
                          isBarrage
                        />
                        {match3.streamLink && <StreamButton link={match3.streamLink} />}
                      </>
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

// ─── Match Leg Row ───────────────────────────────────────────────────────────
function MatchLegRow({
  label,
  playerA,
  playerB,
  scoreA,
  scoreB,
  completed,
  highlightWinner,
  dimmed = false,
  isBarrage = false,
}: {
  label: string;
  playerA: string | null;
  playerB: string | null;
  scoreA: number;
  scoreB: number;
  completed: boolean;
  highlightWinner: boolean;
  dimmed?: boolean;
  isBarrage?: boolean;
}) {
  const winner = completed
    ? scoreA > scoreB ? playerA : playerB
    : null;

  return (
    <div style={{ opacity: dimmed ? 0.4 : 1 }}>
      <div className="text-xs mb-0.5" style={{ color: isBarrage ? '#ef4444' : 'var(--text-secondary)', fontWeight: 600 }}>
        {label}
      </div>
      <div className="flex items-center gap-2 px-2 py-1.5 rounded text-sm"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: `1px solid ${completed ? (isBarrage ? '#ef4444' : '#16a34a') : 'var(--border-color)'}`,
        }}>
        <span
          className="flex-1 truncate text-xs font-medium"
          style={{ color: highlightWinner && winner === playerA && playerA ? 'var(--gold)' : 'var(--text-primary)' }}>
          {playerA || 'TBD'}
        </span>
        <span className="font-mono font-bold text-sm w-6 text-center" style={{ color: 'var(--gold)' }}>
          {completed ? scoreA : '-'}
        </span>
        <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>–</span>
        <span className="font-mono font-bold text-sm w-6 text-center" style={{ color: 'var(--gold)' }}>
          {completed ? scoreB : '-'}
        </span>
        <span
          className="flex-1 truncate text-xs font-medium text-right"
          style={{ color: highlightWinner && winner === playerB && playerB ? 'var(--gold)' : 'var(--text-primary)' }}>
          {playerB || 'TBD'}
        </span>
        {completed && (
          <span className="text-xs ml-1" style={{ color: isBarrage ? '#ef4444' : '#16a34a' }}>✓</span>
        )}
      </div>
    </div>
  );
}