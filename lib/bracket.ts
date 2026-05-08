import { Match } from './db';

export function generateBracket(
  players: string[],
  size: number,
  format: string
): Match[] {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const matches: Match[] = [];
  let matchId = 0;

  if (format === 'Double Elimination') {
    return generateDoubleEliminationBracket(shuffled, size, matchId);
  }

  if (format === 'Best of 3') {
    return generateBestOf3Bracket(shuffled, size, matchId);
  }

  // Single Elimination
  const firstRoundMatches: Match[] = [];
  for (let i = 0; i < size; i += 2) {
    const match: Match = {
      id: `match_${matchId++}`,
      playerA: shuffled[i] || null,
      playerB: shuffled[i + 1] || null,
      scoreA: [0],
      scoreB: [0],
      completed: false,
      round: 1,
    };
    firstRoundMatches.push(match);
    matches.push(match);
  }

  let currentRound = firstRoundMatches;
  let round = 2;

  while (currentRound.length > 1) {
    const nextRound: Match[] = [];
    for (let i = 0; i < currentRound.length; i += 2) {
      const match: Match = {
        id: `match_${matchId++}`,
        playerA: null,
        playerB: null,
        scoreA: [0],
        scoreB: [0],
        completed: false,
        round,
      };
      nextRound.push(match);
      matches.push(match);

      if (currentRound[i]) currentRound[i].nextMatchId = match.id;
      if (currentRound[i + 1]) currentRound[i + 1].nextMatchId = match.id;
    }
    currentRound = nextRound;
    round++;
  }

  return matches;
}

// Double Elimination: each "round" has 2 legs (aller + retour)
// If aggregate tied → barrage match
function generateDoubleEliminationBracket(players: string[], size: number, startId: number): Match[] {
  const matches: Match[] = [];
  let matchId = startId;

  // Build rounds like single elimination but each match has aller + retour + optional barrage
  const firstRoundPairs: { playerA: string | null; playerB: string | null }[] = [];
  for (let i = 0; i < size; i += 2) {
    firstRoundPairs.push({ playerA: players[i] || null, playerB: players[i + 1] || null });
  }

  // We track "round groups" — each group is [aller, retour, barrage?]
  // aller: round 1, retour: round 2, barrage: round 3 (if needed)
  // Next bracket round starts at round 4, etc.

  // For simplicity, we use a multiplier: each logical round = 3 physical rounds
  // round 1 = aller of bracket round 1
  // round 2 = retour of bracket round 1
  // round 3 = barrage of bracket round 1 (optional, created dynamically)

  const roundGroups: Match[][][] = []; // [bracketRound][leg: 0=aller,1=retour,2=barrage]

  // Build first bracket round
  const allerMatches: Match[] = [];
  const retourMatches: Match[] = [];

  firstRoundPairs.forEach(({ playerA, playerB }) => {
    const allerId = `match_${matchId++}`;
    const retourId = `match_${matchId++}`;
    const barrageId = `match_${matchId++}`;

    const aller: Match = {
      id: allerId,
      playerA,
      playerB,
      scoreA: [0],
      scoreB: [0],
      completed: false,
      round: 1,
      matchType: 'aller',
      retourMatchId: retourId,
      barrageMatchId: barrageId,
    };

    const retour: Match = {
      id: retourId,
      playerA,
      playerB,
      scoreA: [0],
      scoreB: [0],
      completed: false,
      round: 2,
      matchType: 'retour',
      allerMatchId: allerId,
      barrageMatchId: barrageId,
    };

    const barrage: Match = {
      id: barrageId,
      playerA: null,
      playerB: null,
      scoreA: [0],
      scoreB: [0],
      completed: false,
      round: 3,
      matchType: 'barrage',
      allerMatchId: allerId,
      retourMatchId: retourId,
      isBarrage: true,
    };

    allerMatches.push(aller);
    retourMatches.push(retour);
    matches.push(aller, retour, barrage);
  });

  // Build subsequent rounds
  let currentAllerGroup = allerMatches;
  let logicalRound = 2;

  while (currentAllerGroup.length > 1) {
    const nextAllerMatches: Match[] = [];
    const nextRetourMatches: Match[] = [];

    for (let i = 0; i < currentAllerGroup.length; i += 2) {
      const physRound = (logicalRound - 1) * 3 + 1;
      const allerId = `match_${matchId++}`;
      const retourId = `match_${matchId++}`;
      const barrageId = `match_${matchId++}`;

      const aller: Match = {
        id: allerId,
        playerA: null,
        playerB: null,
        scoreA: [0],
        scoreB: [0],
        completed: false,
        round: physRound,
        matchType: 'aller',
        retourMatchId: retourId,
        barrageMatchId: barrageId,
      };

      const retour: Match = {
        id: retourId,
        playerA: null,
        playerB: null,
        scoreA: [0],
        scoreB: [0],
        completed: false,
        round: physRound + 1,
        matchType: 'retour',
        allerMatchId: allerId,
        barrageMatchId: barrageId,
      };

      const barrage: Match = {
        id: barrageId,
        playerA: null,
        playerB: null,
        scoreA: [0],
        scoreB: [0],
        completed: false,
        round: physRound + 2,
        matchType: 'barrage',
        allerMatchId: allerId,
        retourMatchId: retourId,
        isBarrage: true,
      };

      // Link previous aller matches to this next aller
      if (currentAllerGroup[i]) currentAllerGroup[i].nextMatchId = allerId;
      if (currentAllerGroup[i + 1]) currentAllerGroup[i + 1].nextMatchId = allerId;

      nextAllerMatches.push(aller);
      nextRetourMatches.push(retour);
      matches.push(aller, retour, barrage);
    }

    currentAllerGroup = nextAllerMatches;
    logicalRound++;
  }

  return matches;
}

// Best of 3: match 1, match 2, optional match 3 (barrage if 1-1)
function generateBestOf3Bracket(players: string[], size: number, startId: number): Match[] {
  const matches: Match[] = [];
  let matchId = startId;

  const firstRoundPairs: { playerA: string | null; playerB: string | null }[] = [];
  for (let i = 0; i < size; i += 2) {
    firstRoundPairs.push({ playerA: players[i] || null, playerB: players[i + 1] || null });
  }

  const firstRoundMatch1s: Match[] = [];

  firstRoundPairs.forEach(({ playerA, playerB }) => {
    const m1Id = `match_${matchId++}`;
    const m2Id = `match_${matchId++}`;
    const m3Id = `match_${matchId++}`;

    const match1: Match = {
      id: m1Id,
      playerA, playerB,
      scoreA: [0], scoreB: [0],
      completed: false,
      round: 1,
      matchType: 'bo3_match1',
      bo3Match2Id: m2Id,
      bo3Match3Id: m3Id,
    };

    const match2: Match = {
      id: m2Id,
      playerA, playerB,
      scoreA: [0], scoreB: [0],
      completed: false,
      round: 2,
      matchType: 'bo3_match2',
      bo3Match1Id: m1Id,
      bo3Match3Id: m3Id,
    };

    const match3: Match = {
      id: m3Id,
      playerA: null, playerB: null,
      scoreA: [0], scoreB: [0],
      completed: false,
      round: 3,
      matchType: 'bo3_match3',
      bo3Match1Id: m1Id,
      bo3Match2Id: m2Id,
      isBarrage: true,
    };

    firstRoundMatch1s.push(match1);
    matches.push(match1, match2, match3);
  });

  // Build subsequent rounds
  let currentMatch1s = firstRoundMatch1s;
  let logicalRound = 2;

  while (currentMatch1s.length > 1) {
    const nextMatch1s: Match[] = [];
    const physRound = (logicalRound - 1) * 3 + 1;

    for (let i = 0; i < currentMatch1s.length; i += 2) {
      const m1Id = `match_${matchId++}`;
      const m2Id = `match_${matchId++}`;
      const m3Id = `match_${matchId++}`;

      const match1: Match = {
        id: m1Id,
        playerA: null, playerB: null,
        scoreA: [0], scoreB: [0],
        completed: false,
        round: physRound,
        matchType: 'bo3_match1',
        bo3Match2Id: m2Id,
        bo3Match3Id: m3Id,
      };

      const match2: Match = {
        id: m2Id,
        playerA: null, playerB: null,
        scoreA: [0], scoreB: [0],
        completed: false,
        round: physRound + 1,
        matchType: 'bo3_match2',
        bo3Match1Id: m1Id,
        bo3Match3Id: m3Id,
      };

      const match3: Match = {
        id: m3Id,
        playerA: null, playerB: null,
        scoreA: [0], scoreB: [0],
        completed: false,
        round: physRound + 2,
        matchType: 'bo3_match3',
        bo3Match1Id: m1Id,
        bo3Match2Id: m2Id,
        isBarrage: true,
      };

      if (currentMatch1s[i]) currentMatch1s[i].nextMatchId = m1Id;
      if (currentMatch1s[i + 1]) currentMatch1s[i + 1].nextMatchId = m1Id;

      nextMatch1s.push(match1);
      matches.push(match1, match2, match3);
    }

    currentMatch1s = nextMatch1s;
    logicalRound++;
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