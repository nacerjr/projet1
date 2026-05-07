'use client';

import { useEffect, useState } from 'react';
import { loadBackgroundImage } from '@/lib/db';
import BottomNav from '@/components/BottomNav';

export default function Home() {
  const [backgroundImage, setBackgroundImage] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const load = async () => {
      const img = await loadBackgroundImage();
      setBackgroundImage(img || '/tournament-bg.jpg');
      setMounted(true);
    };
    load();
  }, []);

  if (!mounted) return null;

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black">
      {/* Background Image */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url('${backgroundImage}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Top Gradient Overlay */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black via-black/50 to-transparent" />

      {/* Bottom Gradient Overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black via-black/50 to-transparent" />

      {/* Bottom Navigation */}
      <BottomNav />
    </main>
  );
}