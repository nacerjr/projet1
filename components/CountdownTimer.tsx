'use client';

import { useEffect, useState } from 'react';
import { loadNextTournamentDate } from '@/lib/db';

export default function CountdownTimer() {
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [showCountdown, setShowCountdown] = useState(false);
  const [targetDate, setTargetDate] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const date = await loadNextTournamentDate();
      if (date) {
        setTargetDate(date);
        setShowCountdown(true);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!targetDate) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const distance = target - now;

      if (distance < 0) {
        setShowCountdown(false);
        clearInterval(interval);
        return;
      }

      setTime({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (!showCountdown) return null;

  return (
    <div className="text-center space-y-2">
      <div className="flex justify-center gap-2 text-sm font-mono">
        {[time.days, time.hours, time.minutes, time.seconds].map((val, i) => (
          <>
            <div key={i} className="bg-[#FFD700]/20 px-3 py-2 rounded min-w-12 text-[#FFD700]">
              {String(val).padStart(2, '0')}
            </div>
            {i < 3 && <span className="text-[#FFD700]/60">:</span>}
          </>
        ))}
      </div>
      <p className="text-[#FFD700]/70 text-xs">À venir</p>
    </div>
  );
}