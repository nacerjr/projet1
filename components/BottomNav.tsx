'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Users, MessageCircle } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/bracket', label: 'Bracket', icon: Trophy },
    { path: '/players', label: 'Players', icon: Users },
    { path: '/contact', label: 'Contact', icon: MessageCircle },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 backdrop-blur-sm z-50" style={{ backgroundColor: 'var(--bg-primary)', borderTopColor: 'var(--gold)' }}>
      <div className="flex justify-around items-center h-20 max-w-md mx-auto px-4" style={{ borderTop: '1px solid var(--gold)' }}>
        {navItems.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            href={path}
            className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors ${
              isActive(path)
                ? 'opacity-100'
                : 'opacity-60 hover:opacity-100'
            }`}
            style={{ color: isActive(path) ? 'var(--gold)' : 'var(--text-secondary)' }}
          >
            <Icon size={24} />
            <span className="text-xs font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
