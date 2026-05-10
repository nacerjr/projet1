'use client';

import { Tournament, Match } from '@/lib/db';
import { Download } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface ExportBracketProps {
  tournament: Tournament;
}

function getLogicalRoundName(groupIndex: number, totalGroups: number): string {
  const fromEnd = totalGroups - groupIndex;
  if (fromEnd === 1) return 'Final';
  if (fromEnd === 2) return 'Semi-Final';
  if (fromEnd === 3) return 'Quarter-Final';
  if (fromEnd === 4) return 'Round of 16';
  if (fromEnd === 5) return 'Round of 32';
  if (fromEnd === 6) return 'Round of 64';
  if (fromEnd === 7) return 'Round of 128';
  if (fromEnd === 8) return 'Round of 256';
  return `Round ${groupIndex + 1}`;
}

function getSingleRoundName(matchCount: number): string {
  const p = matchCount * 2;
  if (p === 2) return 'Final';
  if (p === 4) return 'Semi-Final';
  if (p === 8) return 'Quarter-Final';
  return `Round of ${p}`;
}

export default function ExportBracket({ tournament }: ExportBracketProps) {
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const L = 20;
    const R = pageW - 20;

    const setGold  = () => doc.setTextColor(255, 215, 0);
    const setWhite = () => doc.setTextColor(220, 220, 220);
    const setGray  = () => doc.setTextColor(130, 130, 130);
    const setGreen = () => doc.setTextColor(74, 200, 100);
    const setRed   = () => doc.setTextColor(239, 100, 80);

    doc.setFillColor(13, 13, 13);
    doc.rect(0, 0, pageW, pageH, 'F');

    let y = 22;

    const newPage = () => {
      doc.addPage();
      doc.setFillColor(13, 13, 13);
      doc.rect(0, 0, pageW, pageH, 'F');
      y = 18;
    };

    const check = (need: number) => { if (y + need > pageH - 14) newPage(); };

    // Header
    setGold();
    doc.setFontSize(17);
    doc.setFont('helvetica', 'bold');
    doc.text(tournament.name || 'Tournament', pageW / 2, y, { align: 'center' });
    y += 6;
    setGray();
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${tournament.format} · ${tournament.size} joueurs`, pageW / 2, y, { align: 'center' });
    y += 5;
    doc.setDrawColor(255, 215, 0);
    doc.setLineWidth(0.4);
    doc.line(L, y, R, y);
    y += 10;

    // ── helpers ───────────────────────────────────────────────────────────────

    const drawRoundTitle = (name: string) => {
      check(14);
      setGold();
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(name, L, y);
      doc.setDrawColor(255, 215, 0);
      doc.setLineWidth(0.25);
      doc.line(L, y + 1.5, R, y + 1.5);
      y += 7;
    };

    // Write one result line: "winner [sA-sB] loser" or "pA vs pB" if not played
    // For Double Elimination: prefix (Aller/Retour) is printed on its own line first,
    // then the match content is indented on the next line — no overlap.
    const writeLine = (
      prefix: string,
      pA: string,
      pB: string,
      sA: number,
      sB: number,
      completed: boolean,
      contextWinner: string | null,
      isDecider = false
    ) => {
      // If there's a prefix (Aller / Retour), print it on its own line first
      if (prefix) {
        check(11); // need space for label line + content line
        if (isDecider) setRed(); else setGray();
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text(prefix, L, y);
        y += 4.5; // move down before printing the match line
      } else {
        check(6);
      }

      const indent = prefix ? L + 4 : L + 2;

      doc.setFontSize(9);

      if (!completed) {
        setGray();
        doc.setFont('helvetica', 'normal');
        doc.text(`${pA || 'TBD'}  –  ${pB || 'TBD'}`, indent, y);
        y += 5.5;
        return;
      }

      // Determine who won this specific leg
      const legWinner = sA > sB ? pA : sB > sA ? pB : null;

      let x = indent;

      // pA
      if (legWinner === pA) { setGold(); doc.setFont('helvetica', 'bold'); }
      else { setGray(); doc.setFont('helvetica', 'normal'); }
      doc.text(pA || 'TBD', x, y);
      x += doc.getTextWidth(pA || 'TBD') + 1.5;

      // score
      setGray();
      doc.setFont('helvetica', 'normal');
      const score = `[${sA}-${sB}]`;
      doc.text(score, x, y);
      x += doc.getTextWidth(score) + 1.5;

      // pB
      if (legWinner === pB) { setGold(); doc.setFont('helvetica', 'bold'); }
      else { setGray(); doc.setFont('helvetica', 'normal'); }
      doc.text(pB || 'TBD', x, y);

      y += 5.5;
    };

    // ── SINGLE ELIMINATION ────────────────────────────────────────────────────
    if (tournament.format === 'Single Elimination') {
      const byRound = tournament.bracket.reduce((acc, m) => {
        if (!acc[m.round]) acc[m.round] = [];
        acc[m.round].push(m);
        return acc;
      }, {} as Record<number, Match[]>);
      const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b);

      rounds.forEach(round => {
        const matches = byRound[round];
        drawRoundTitle(getSingleRoundName(matches.length));

        matches.forEach(match => {
          // Bye handling
          let winner: string | null = null;
          if (match.round === 1) {
            if (!match.playerA && match.playerB) winner = match.playerB;
            else if (!match.playerB && match.playerA) winner = match.playerA;
          }
          if (!winner && match.completed) {
            winner = match.scoreA[0] > match.scoreB[0] ? match.playerA : match.playerB;
          }
          writeLine('', match.playerA || 'TBD', match.playerB || 'TBD', match.scoreA[0], match.scoreB[0], match.completed, winner);
        });

        y += 5;
      });
    }

    // ── DOUBLE ELIMINATION ────────────────────────────────────────────────────
    else if (tournament.format === 'Double Elimination') {
      const bracket = tournament.bracket;
      const allerMatches = bracket.filter(m => m.matchType === 'aller').sort((a, b) => a.round - b.round);

      const roundGroups: Match[][] = [];
      let curR = -1, curG: Match[] = [];
      allerMatches.forEach(am => {
        if (am.round !== curR) { if (curG.length > 0) roundGroups.push(curG); curG = [am]; curR = am.round; }
        else curG.push(am);
      });
      if (curG.length > 0) roundGroups.push(curG);

      roundGroups.forEach((group, gIdx) => {
        drawRoundTitle(getLogicalRoundName(gIdx, roundGroups.length));

        group.forEach((allerMatch, mIdx) => {
          const retour  = bracket.find(m => m.id === allerMatch.retourMatchId);
          const barrage = bracket.find(m => m.id === allerMatch.barrageMatchId);

          const pA  = allerMatch.playerA || 'TBD';
          const pB  = allerMatch.playerB || 'TBD';
          const rpA = (retour?.playerA ?? allerMatch.playerA) || 'TBD';
          const rpB = (retour?.playerB ?? allerMatch.playerB) || 'TBD';

          const aggA = (allerMatch.scoreA[0] || 0) + (retour?.scoreA[0] || 0);
          const aggB = (allerMatch.scoreB[0] || 0) + (retour?.scoreB[0] || 0);

          let winner: string | null = null;
          if (barrage?.completed) {
            winner = barrage.scoreA[0] > barrage.scoreB[0] ? barrage.playerA : barrage.playerB;
          } else if (allerMatch.completed && retour?.completed) {
            if (aggA > aggB) winner = allerMatch.playerA;
            else if (aggB > aggA) winner = allerMatch.playerB;
          }

          check(26);

          // Match header line
          setGold();
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(`Match ${mIdx + 1}  ${pA} vs ${pB}`, L, y);
          if (winner) {
            setGreen();
            doc.text(`✓ ${winner}`, R, y, { align: 'right' });
          }
          y += 5;

          // Aller — label on its own line, content indented below
          writeLine('Aller', pA, pB, allerMatch.scoreA[0], allerMatch.scoreB[0], allerMatch.completed, winner);

          // Retour — label on its own line, content indented below
          if (retour) {
            writeLine('Retour', rpA, rpB, retour.scoreA[0], retour.scoreB[0], retour.completed, winner);
          }

          // Aggregate
          if (allerMatch.completed && retour?.completed) {
            check(5);
            setGray();
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            const aStr = `Agrégat — ${pA}: ${aggA}  |  ${pB}: ${aggB}`;
            doc.text(aStr, L + 5, y);
            y += 5;
          }

          // Barrage
          const needBarrage = allerMatch.completed && retour?.completed && aggA === aggB;
          if (barrage && (needBarrage || barrage.completed || barrage.barrageNeeded)) {
            const bpA = (barrage.playerA ?? allerMatch.playerA) || 'TBD';
            const bpB = (barrage.playerB ?? allerMatch.playerB) || 'TBD';
            check(10);
            setRed();
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text('⚡ Barrage', L, y);
            y += 4.5;
            writeLine('', bpA, bpB, barrage.scoreA[0], barrage.scoreB[0], barrage.completed, winner, true);
          }

          y += 3;
        });

        y += 4;
      });
    }

    // ── BEST OF 3 ─────────────────────────────────────────────────────────────
    else if (tournament.format === 'Best of 3') {
      const bracket = tournament.bracket;
      const match1s = bracket.filter(m => m.matchType === 'bo3_match1').sort((a, b) => a.round - b.round);

      const roundGroups: Match[][] = [];
      let curR = -1, curG: Match[] = [];
      match1s.forEach(m => {
        if (m.round !== curR) { if (curG.length > 0) roundGroups.push(curG); curG = [m]; curR = m.round; }
        else curG.push(m);
      });
      if (curG.length > 0) roundGroups.push(curG);

      roundGroups.forEach((group, gIdx) => {
        drawRoundTitle(getLogicalRoundName(gIdx, roundGroups.length));

        group.forEach((match1, mIdx) => {
          const match2 = bracket.find(m => m.id === match1.bo3Match2Id);
          const match3 = bracket.find(m => m.id === match1.bo3Match3Id);

          const pA = match1.playerA || 'TBD';
          const pB = match1.playerB || 'TBD';
          const m2pA = (match2?.playerA ?? match1.playerA) || 'TBD';
          const m2pB = (match2?.playerB ?? match1.playerB) || 'TBD';
          const m3pA = (match3?.playerA ?? match1.playerA) || 'TBD';
          const m3pB = (match3?.playerB ?? match1.playerB) || 'TBD';

          const w1 = match1.completed ? (match1.scoreA[0] > match1.scoreB[0] ? match1.playerA : match1.playerB) : null;
          const w2 = match2?.completed ? (match2.scoreA[0] > match2.scoreB[0] ? match1.playerA : match1.playerB) : null;
          const is11 = w1 && w2 && w1 !== w2;

          let seriesWinner: string | null = null;
          if (w1 && w2) {
            if (w1 === w2) seriesWinner = w1;
            else if (match3?.completed) {
              seriesWinner = match3.scoreA[0] > match3.scoreB[0] ? match1.playerA : match1.playerB;
            }
          }

          const showMatch3 = !!is11 || !!match3?.completed;
          check(26);

          // Match header
          setGold();
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(`Match ${mIdx + 1}  ${pA} vs ${pB}`, L, y);
          if (seriesWinner) {
            setGreen();
            doc.text(`✓ ${seriesWinner}`, R, y, { align: 'right' });
          } else if (is11) {
            setRed();
            doc.setFont('helvetica', 'normal');
            doc.text('1-1', R, y, { align: 'right' });
          }
          y += 5;

          writeLine('M1', pA, pB, match1.scoreA[0], match1.scoreB[0], match1.completed, seriesWinner);
          if (match2) writeLine('M2', m2pA, m2pB, match2.scoreA[0], match2.scoreB[0], match2.completed, seriesWinner);

          if (showMatch3 && match3) {
            check(10);
            setRed();
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text('⚡ M3', L, y);
            y += 4.5;
            writeLine('', m3pA, m3pB, match3.scoreA[0], match3.scoreB[0], match3.completed, seriesWinner, true);
          }

          y += 3;
        });

        y += 4;
      });
    }

    // Footer
    const total = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      setGray();
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text('Generated by cup', pageW / 2, pageH - 6, { align: 'center' });
      if (total > 1) doc.text(`${i} / ${total}`, R, pageH - 6, { align: 'right' });
    }

    const filename = tournament.name
      ? `cup-${tournament.name.toLowerCase().replace(/\s+/g, '-')}.pdf`
      : 'cup-bracket.pdf';
    doc.save(filename);
  };

  return (
    <button
      onClick={exportPDF}
      className="flex items-center gap-2 px-3 py-2 rounded transition-colors text-sm font-semibold"
      style={{ backgroundColor: 'var(--gold)', color: 'var(--bg-primary)', border: 'none', cursor: 'pointer' }}
    >
      <Download size={16} />
      Export PDF
    </button>
  );
}