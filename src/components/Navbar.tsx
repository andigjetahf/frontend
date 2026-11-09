'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();

  return (
    <nav className="bg-dark-card border-b border-dark-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <span className="text-cyber-green font-mono font-bold text-xl tracking-widest animate-glow select-none">
              ⚡ CyberRange
            </span>
            <span className="hidden sm:inline text-dark-border font-mono text-xs text-gray-600">
              v1.0
            </span>
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-4">
            {isAdmin && (
              <span className="text-cyber-cyan font-mono text-xs uppercase tracking-widest border border-cyber-cyan/40 rounded px-2 py-0.5">
                Admin
              </span>
            )}

            {user && (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-gray-200 font-mono text-sm leading-none">
                    {user.displayName || user.username}
                  </span>
                  <span className="text-gray-500 font-mono text-xs">{user.email}</span>
                </div>
                <div
                  className={`w-2 h-2 rounded-full ${
                    isAdmin ? 'bg-cyber-cyan shadow-cyber-cyan' : 'bg-cyber-green shadow-cyber'
                  } shadow-sm`}
                />
              </div>
            )}

            <button
              onClick={logout}
              className="
                font-mono text-xs uppercase tracking-widest px-3 py-1.5
                border border-cyber-red/50 text-cyber-red
                hover:bg-cyber-red hover:text-dark-bg
                transition-all duration-150 rounded
              "
            >
              [ LOGOUT ]
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
