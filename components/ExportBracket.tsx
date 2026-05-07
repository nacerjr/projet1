'use client';

import { Tournament, Match } from '@/lib/storage';
import { Download } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface ExportBracketProps {
  tournament: Tournament;
}

const getRoundName = (round: number, totalRounds: number): string => {
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
};

export default function ExportBracket({ tournament }: ExportBracketProps) {
  const getWinner = (match: Match): string | null => {
    if (match.round === 1) {
      const isByeA = (match.playerA === null || match.playerA === '') && (match.playerB !== null && match.playerB !== '');
      const isByeB = (match.playerB === null || match.playerB === '') && (match.playerA !== null && match.playerA !== '');
      if (isByeA) return match.playerB;
      if (isByeB) return match.playerA;
    }

    if (!match.completed) return null;

    if (tournament.format === 'Single Elimination' || tournament.format === 'Élimination directe') {
      return match.scoreA[0] > match.scoreB[0] ? match.playerA : match.playerB;
    } else if (tournament.format === 'Two-Leg' || tournament.format === 'Aller-retour') {
      const totalA = match.scoreA[0] + match.scoreA[1];
      const totalB = match.scoreB[0] + match.scoreB[1];
      return totalA > totalB ? match.playerA : match.playerB;
    } else if (tournament.format === 'Best of 3') {
      let winsA = 0, winsB = 0;
      for (let i = 0; i < 3; i++) {
        if (match.scoreA[i] > match.scoreB[i]) winsA++;
        if (match.scoreB[i] > match.scoreA[i]) winsB++;
      }
      return winsA > winsB ? match.playerA : match.playerB;
    }
    return null;
  };

  const exportPDF = () => {
    // Group matches by round
    const matchesByRound = tournament.bracket.reduce((acc, match) => {
      if (!acc[match.round]) acc[match.round] = [];
      acc[match.round].push(match);
      return acc;
    }, {} as Record<number, Match[]>);

    const sortedRounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);
    const totalRounds = sortedRounds.length;

    // Create PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Set default dark background
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    doc.setFillColor(13, 13, 13); // #0D0D0D
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    let yPos = 20;

    // Header (first page only)
    doc.setTextColor(255, 215, 0); // Gold #FFD700
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text(tournament.name || 'Tournament Bracket', pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 8;
    doc.setTextColor(255, 255, 255); // White #FFFFFF
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text('TOURNEX', pageWidth / 2, yPos, { align: 'center' });

    // Draw horizontal line
    yPos += 6;
    doc.setDrawColor(255, 215, 0); // Gold
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);

    yPos += 8;

    // Draw each round
    sortedRounds.forEach((round) => {
      const matches = matchesByRound[round];
      const roundName = getRoundName(round, totalRounds);

      // Check if we need a new page
      if (yPos > pageHeight - 30) {
        doc.addPage();
        doc.setFillColor(13, 13, 13);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        yPos = 20;
      }

      // Round header with underline
      doc.setTextColor(255, 215, 0); // Gold
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(roundName, 20, yPos);

      const lineY = yPos + 1;
      doc.setDrawColor(255, 215, 0); // Gold
      doc.setLineWidth(0.3);
      doc.line(20, lineY, pageWidth - 20, lineY);

      yPos += 6;

      // Matches in this round
      matches.forEach((match) => {
        const winner = getWinner(match);
        const playerA = match.playerA || 'TBD';
        const playerB = match.playerB || 'TBD';

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');

        if (match.completed && winner) {
          // Completed match - format: playerA [scoreA-scoreB] playerB
          const scoreStr = `${match.scoreA[0]}-${match.scoreB[0]}`;
          const matchText = `${playerA} [${scoreStr}] ${playerB}`;
          
          // Determine positions for text rendering
          doc.setTextColor(255, 255, 255); // Default white
          
          // Render name by name with proper coloring
          if (winner === playerA) {
            doc.setTextColor(255, 215, 0); // Gold for winner
            doc.text(playerA, 20, yPos);
            // Calculate width and continue with white text
            const playerAWidth = doc.getTextWidth(playerA);
            doc.setTextColor(255, 255, 255); // White for rest
            doc.text(` [${scoreStr}] ${playerB}`, 20 + playerAWidth, yPos);
          } else {
            doc.text(`${playerA} [${scoreStr}] `, 20, yPos);
            const prefixWidth = doc.getTextWidth(`${playerA} [${scoreStr}] `);
            doc.setTextColor(255, 215, 0); // Gold for winner
            doc.text(playerB, 20 + prefixWidth, yPos);
          }
        } else {
          // Pending match
          doc.setTextColor(255, 255, 255); // White
          doc.text(`${playerA} vs ${playerB}`, 20, yPos);
        }

        yPos += 4;
        yPos += 3; // Space between matches
      });

      yPos += 7; // Space between rounds
    });

    // Footer on last page
    doc.setTextColor(150, 150, 150); // Gray
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('Generated by TOURNEX', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Download
    const filename = tournament.name 
      ? `tournex-${tournament.name.toLowerCase().replace(/\s+/g, '-')}.pdf`
      : 'tournex-bracket.pdf';
    
    doc.save(filename);
  };

  return (
    <button
      onClick={exportPDF}
      className="flex items-center gap-2 px-3 py-2 rounded transition-colors text-sm font-semibold"
      style={{
        backgroundColor: 'var(--gold)',
        color: 'var(--bg-primary)',
        border: 'none',
        cursor: 'pointer'
      }}
    >
      <Download size={16} />
      Export PDF
    </button>
  );
}
