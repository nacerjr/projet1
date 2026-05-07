'use client';

import { useEffect, useState } from 'react';
import { getStorage } from '@/lib/storage';
import BottomNav from '@/components/BottomNav';
import { ThemeToggle } from '@/components/ThemeProvider';
import { MessageCircle } from 'lucide-react';

export default function ContactPage() {
  const [whatsappLink, setWhatsappLink] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setWhatsappLink(getStorage('whatsappLink'));
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleWhatsappClick = () => {
    if (whatsappLink) {
      window.open(whatsappLink, '_blank');
    }
  };

  return (
    <main className="min-h-screen pb-24 max-w-md mx-auto flex flex-col items-center justify-center px-4" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      <div className="absolute top-6 left-6">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--gold)' }}>Contact</h1>
      </div>
      <button
        onClick={handleWhatsappClick}
        disabled={!whatsappLink}
        className="flex items-center gap-3 px-8 py-4 rounded-lg font-semibold text-lg transition-all"
        style={{
          backgroundColor: whatsappLink ? '#25D366' : 'var(--text-secondary)',
          color: whatsappLink ? 'white' : 'var(--text-secondary)',
          opacity: whatsappLink ? 1 : 0.6,
          cursor: whatsappLink ? 'pointer' : 'not-allowed'
        }}
      >
        <MessageCircle size={28} />
        Join WhatsApp Group
      </button>

      {!whatsappLink && (
        <p className="text-center mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Link not configured
        </p>
      )}

      <BottomNav />
    </main>
  );
}
