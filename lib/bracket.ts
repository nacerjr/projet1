import { Match } from './db';

export function generateBracket(
  players: string[],
  size: number,
  format: string
): Match[] {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const matches: Match[] = [];
  let matchId = 0;

  // First round
  const firstRoundMatches: Match[] = [];
  for (let i = 0; i < size; i += 2) {
    const match: Match = {
      id: `match_${matchId++}`,
      playerA: shuffled[i] || null,
      playerB: shuffled[i + 1] || null,
      scoreA: format === 'Best of 3' ? [0, 0, 0] : [0, 0],
      scoreB: format === 'Best of 3' ? [0, 0, 0] : [0, 0],
      completed: false,
      round: 1,
    };
    firstRoundMatches.push(match);
    matches.push(match);
  }

  // Subsequent rounds
  let currentRound = firstRoundMatches;
  let round = 2;

  while (currentRound.length > 1) {
    const nextRound: Match[] = [];
    for (let i = 0; i < currentRound.length; i += 2) {
      const match: Match = {
        id: `match_${matchId++}`,
        playerA: null,
        playerB: null,
        scoreA: format === 'Best of 3' ? [0, 0, 0] : [0, 0],
        scoreB: format === 'Best of 3' ? [0, 0, 0] : [0, 0],
        completed: false,
        nextMatchId: undefined,
        round,
      };
      nextRound.push(match);
      matches.push(match);

      // Link previous round winners to this match
      const match1 = currentRound[i];
      const match2 = currentRound[i + 1];

      if (match1) {
        match1.nextMatchId = match.id;
      }
      if (match2) {
        match2.nextMatchId = match.id;
      }
    }
    currentRound = nextRound;
    round++;
  }

  return matches;
}

export function getRoundName(round: number, totalRounds: number): string {
  const roundsFromEnd = totalRounds - round + 1;
  if (roundsFromEnd === 1) return 'Final';
  if (roundsFromEnd === 2) return 'Semi-Final';
  if (roundsFromEnd === 3) return 'Quarter-Final';
  if (roundsFromEnd === 4) return 'Round of 16';
  if (roundsFromEnd === 5) return 'Round of 32';
  if (roundsFromEnd === 6) return 'Round of 64';
  if (roundsFromEnd === 7) return 'Round of 128';
  if (roundsFromEnd === 8) return 'Round of 256';
  return `Round of ${Math.pow(2, roundsFromEnd - 1)}`;
}
