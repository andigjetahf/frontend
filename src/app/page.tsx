'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-dark-bg">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-cyber-green border-t-transparent rounded-full animate-spin" />
        <span className="font-mono text-cyber-green text-sm animate-pulse">
          Initializing...
        </span>
      </div>
    </div>
  );
}

