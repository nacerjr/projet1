'use client';

import { useEffect } from 'react';

export function useClickSound() {
  useEffect(() => {
    let audioContext: AudioContext | null = null;

    const playClickSound = () => {
      // Initialize AudioContext on first interaction (mobile compliance)
      if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      // Create oscillator for click sound
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      // Click sound parameters: ~800Hz sine wave with quick attack/decay
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      // Quick envelope: instant attack, ~30ms decay
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);

      oscillator.start(now);
      oscillator.stop(now + 0.03);
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if click is on a button or element with role="button"
      if (
        target.tagName === 'BUTTON' ||
        target.closest('button') ||
        target.getAttribute('role') === 'button' ||
        target.getAttribute('type') === 'submit' ||
        target.closest('[role="button"]')
      ) {
        playClickSound();
      }
    };

    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
      if (audioContext) {
        audioContext.close();
      }
    };
  }, []);
}
