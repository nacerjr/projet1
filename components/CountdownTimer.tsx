'use client';

import { useEffect, useState } from 'react';
import { getStorage } from '@/lib/storage';

export default function CountdownTimer() {
  const [time, setTime] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [showCountdown, setShowCountdown] = useState(false);

  useEffect(() => {
    const checkCountdown = () => {
      const show = getStorage('showCountdown');
      const date = getStorage('nextTournamentDate');
      setShowCountdown(show && !!date);
    };

    checkCountdown();

    const interval = setInterval(() => {
      const date = getStorage('nextTournamentDate');
      if (!date || !getStorage('showCountdown')) {
        setShowCountdown(false);
        return;
      }

      const now = new Date().getTime();
      const target = new Date(date).getTime();
      const distance = target - now;

      if (distance < 0) {
        setShowCountdown(false);
        return;
      }

      setTime({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor(
          (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        ),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!showCountdown) return null;

  return (
    <div className="text-center space-y-2">
      <div className="flex justify-center gap-2 text-sm font-mono">
        <div className="bg-[#FFD700]/20 px-3 py-2 rounded min-w-12 text-[#FFD700]">
          {String(time.days).padStart(2, '0')}
        </div>
        <span className="text-[#FFD700]/60">:</span>
        <div className="bg-[#FFD700]/20 px-3 py-2 rounded min-w-12 text-[#FFD700]">
          {String(time.hours).padStart(2, '0')}
        </div>
        <span className="text-[#FFD700]/60">:</span>
        <div className="bg-[#FFD700]/20 px-3 py-2 rounded min-w-12 text-[#FFD700]">
          {String(time.minutes).padStart(2, '0')}
        </div>
        <span className="text-[#FFD700]/60">:</span>
        <div className="bg-[#FFD700]/20 px-3 py-2 rounded min-w-12 text-[#FFD700]">
          {String(time.seconds).padStart(2, '0')}
        </div>
      </div>
      <p className="text-[#FFD700]/70 text-xs">À venir</p>
    </div>
  );
}
