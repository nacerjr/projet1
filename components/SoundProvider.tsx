'use client';

import { useClickSound } from '@/hooks/useClickSound';

export function SoundProvider({ children }: { children: React.ReactNode }) {
  useClickSound();
  return <>{children}</>;
}
