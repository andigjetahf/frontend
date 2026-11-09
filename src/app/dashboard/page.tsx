'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import UserDashboard from '@/components/UserDashboard';
import AdminDashboard from '@/components/AdminDashboard';

export default function DashboardPage() {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-cyber-green border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-cyber-green text-sm animate-pulse">
            Loading session...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      {/* Scan-line overlay */}
      <div className="fixed inset-0 pointer-events-none scanlines opacity-5 z-0" />

      <Navbar />

      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {isAdmin ? <AdminDashboard /> : <UserDashboard />}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-dark-border py-3 text-center">
        <p className="font-mono text-xs text-gray-700">
          CyberRange CTF Platform — All activity is logged.
        </p>
      </footer>
    </div>
  );
}

