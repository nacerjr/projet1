'use client';

import { useEffect, useState, useRef } from 'react';
import { loadBackgroundImage, loadBackgroundVideo } from '@/lib/db';
import BottomNav from '@/components/BottomNav';

function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url);
}

function getYouTubeEmbedUrl(url: string): string {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/shorts\/([^?&/]+)/,
    /youtu\.be\/([^?&/]+)/,
    /youtube\.com\/embed\/([^?&/]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const id = match[1];
      return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&controls=0&playlist=${id}&playsinline=1&rel=0&modestbranding=1`;
    }
  }
  return '';
}

export default function Home() {
  const [backgroundImage, setBackgroundImage] = useState('');
  const [backgroundVideo, setBackgroundVideo] = useState('');
  const [mounted, setMounted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const load = async () => {
      const [img, vid] = await Promise.all([
        loadBackgroundImage(),
        loadBackgroundVideo(),
      ]);
      setBackgroundImage(img || '');
      setBackgroundVideo(vid || '');
      setMounted(true);
    };
    load();
  }, []);

  useEffect(() => {
    if (backgroundVideo && !isYouTubeUrl(backgroundVideo) && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [backgroundVideo]);

  if (!mounted) return null;

  const isYT = backgroundVideo && isYouTubeUrl(backgroundVideo);
  const ytEmbed = isYT ? getYouTubeEmbedUrl(backgroundVideo) : '';

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black">

      {backgroundVideo ? (
        isYT && ytEmbed ? (
          <div className="absolute inset-0 overflow-hidden" style={{ pointerEvents: 'none' }}>
            <iframe
              src={ytEmbed}
              allow="autoplay; encrypted-media"
              className="absolute"
              style={{
                top: '50%', left: '50%',
                width: '177.78vh', height: '56.25vw',
                minWidth: '100%', minHeight: '100%',
                transform: 'translate(-50%, -50%)',
                border: 'none',
              }}
            />
          </div>
        ) : (
          <video
            ref={videoRef}
            key={backgroundVideo}
            src={backgroundVideo}
            autoPlay
            muted
            loop
            playsInline
            disablePictureInPicture
            className="absolute inset-0 w-full h-full object-cover"
            style={{ pointerEvents: 'none' }}
            onError={() => setBackgroundVideo('')}
          />
        )
      ) : backgroundImage ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url('${backgroundImage}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      ) : null}

      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black via-black/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black via-black/50 to-transparent" />

      <BottomNav />
    </main>
  );
}