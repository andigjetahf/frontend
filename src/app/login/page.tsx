'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { login as authLogin, changePassword } from '@/lib/authApi';
import type { AuthStatus } from '@/types';

type LoginPhase = 'login' | 'must-change-password';

function TerminalLine({ text, blink = false }: { text: string; blink?: boolean }) {
  return (
    <div className="font-mono text-xs text-gray-500 flex items-center gap-1">
      <span className="text-cyber-green">$</span>
      <span>{text}</span>
      {blink && (
        <span className="inline-block w-2 h-3 bg-cyber-green animate-pulse ml-0.5" />
      )}
    </div>
  );
}

function StatusBanner({ status, message }: { status: AuthStatus; message: string }) {
  const styles: Partial<Record<AuthStatus, string>> = {
    INVALID_CREDENTIALS: 'border-cyber-red/50 bg-cyber-red/10 text-cyber-red',
    ACCOUNT_LOCKED: 'border-cyber-red/50 bg-cyber-red/10 text-cyber-red',
    ACCOUNT_EXPIRED: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400',
    UNAUTHORIZED_GROUP: 'border-cyber-red/50 bg-cyber-red/10 text-cyber-red font-semibold',
    SERVICE_ERROR: 'border-orange-500/50 bg-orange-500/10 text-orange-400',
  };
  const icon: Partial<Record<AuthStatus, string>> = {
    INVALID_CREDENTIALS: '✗',
    ACCOUNT_LOCKED: '🔒',
    ACCOUNT_EXPIRED: '⚠',
    UNAUTHORIZED_GROUP: '⛔',
    SERVICE_ERROR: '⚡',
  };
  const cls = styles[status] ?? 'border-gray-700 bg-gray-800 text-gray-300';
  return (
    <div className={`border rounded px-3 py-2 font-mono text-xs ${cls}`}>
      {icon[status] ?? '!'} {message}
    </div>
  );
}

export default function LoginPage() {
  const { user, isLoading, login: ctxLogin } = useAuth();
  const router = useRouter();

  const [phase, setPhase] = useState<LoginPhase>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mustChangeToken, setMustChangeToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<AuthStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorStatus(null);
    setErrorMsg('');

    const response = await authLogin(username.trim(), password);

    if (response.status === 'SUCCESS' && response.token) {
      ctxLogin(response.token);
      router.replace('/dashboard');
      return;
    }

    if (response.status === 'MUST_CHANGE_PASSWORD' && response.mustChangePasswordToken) {
      setMustChangeToken(response.mustChangePasswordToken);
      setPhase('must-change-password');
      setLoading(false);
      return;
    }

    setErrorStatus(response.status as AuthStatus);
    setErrorMsg(response.message || 'Authentication failed.');
    setLoading(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorStatus(null);
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword !== confirmPassword) {
      setErrorStatus('SERVICE_ERROR');
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (newPassword.length < 10) {
      setErrorStatus('SERVICE_ERROR');
      setErrorMsg('New password must be at least 10 characters.');
      return;
    }

    setLoading(true);
    const result = await changePassword(mustChangeToken, newPassword);
    setLoading(false);

    if (result.success) {
      setSuccessMsg('Password changed! Logging you in...');
      // Re-login with new password
      const response = await authLogin(username.trim(), newPassword);
      if (response.status === 'SUCCESS' && response.token) {
        ctxLogin(response.token);
        router.replace('/dashboard');
      } else {
        setSuccessMsg('Password changed. Please log in.');
        setPhase('login');
        setPassword('');
      }
    } else {
      setErrorStatus('SERVICE_ERROR');
      setErrorMsg(result.message || 'Failed to change password.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-bg">
        <div className="w-6 h-6 border-2 border-cyber-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center px-4">
      {/* Scan-line overlay */}
      <div className="fixed inset-0 pointer-events-none scanlines opacity-5 z-0" />

      <div className="relative z-10 w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="font-mono text-3xl font-bold text-cyber-green tracking-tight glow-green">
            ⚡ CyberRange
          </h1>
          <p className="font-mono text-xs text-gray-500 tracking-widest uppercase">
            CTF Training Platform
          </p>
        </div>

        {/* Terminal log lines */}
        <div className="border border-dark-border bg-dark-card rounded p-3 space-y-1">
          <TerminalLine text="Connecting to AD broker..." />
          <TerminalLine text="LDAP/TLS handshake OK" />
          <TerminalLine text="Awaiting credentials..." blink={!loading} />
          {loading && <TerminalLine text="Authenticating..." blink />}
        </div>

        {/* Form box */}
        <div className="border border-dark-border bg-dark-card rounded-lg p-6 space-y-4">
          {phase === 'login' ? (
            <>
              <h2 className="font-mono text-xs text-cyber-cyan uppercase tracking-widest">
                // Authentication Required
              </h2>

              {errorStatus && errorMsg && (
                <StatusBanner status={errorStatus} message={errorMsg} />
              )}
              {successMsg && (
                <div className="border border-cyber-green/40 bg-cyber-green/10 text-cyber-green font-mono text-xs rounded px-3 py-2">
                  ✓ {successMsg}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="font-mono text-xs text-gray-500 uppercase tracking-wider">
                    Username
                  </label>
                  <input
                    type="text"
                    autoComplete="username"
                    autoFocus
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="
                      w-full bg-black border border-dark-border rounded px-3 py-2
                      font-mono text-sm text-gray-200
                      focus:outline-none focus:border-cyber-green/60 focus:ring-1 focus:ring-cyber-green/20
                      transition-colors
                    "
                    placeholder="domain\\username"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-xs text-gray-500 uppercase tracking-wider">
                    Password
                  </label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="
                      w-full bg-black border border-dark-border rounded px-3 py-2
                      font-mono text-sm text-gray-200
                      focus:outline-none focus:border-cyber-green/60 focus:ring-1 focus:ring-cyber-green/20
                      transition-colors
                    "
                    placeholder="••••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !username || !password}
                  className="
                    w-full font-mono text-xs uppercase tracking-widest py-2.5 rounded border
                    border-cyber-green/60 text-cyber-green
                    hover:bg-cyber-green hover:text-dark-bg
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-cyber-green
                    transition-all duration-150
                  "
                >
                  {loading ? '[ AUTHENTICATING... ]' : '[ AUTHENTICATE ]'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="font-mono text-xs text-yellow-400 uppercase tracking-widest">
                // Password Change Required
              </h2>
              <p className="font-mono text-xs text-gray-400">
                Your AD account requires a password change before you can continue.
                Choose a strong password (min 10 characters).
              </p>

              {errorStatus && errorMsg && (
                <StatusBanner status={errorStatus} message={errorMsg} />
              )}
              {successMsg && (
                <div className="border border-cyber-green/40 bg-cyber-green/10 text-cyber-green font-mono text-xs rounded px-3 py-2">
                  ✓ {successMsg}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1">
                  <label className="font-mono text-xs text-gray-500 uppercase tracking-wider">
                    New Password
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    autoFocus
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="
                      w-full bg-black border border-dark-border rounded px-3 py-2
                      font-mono text-sm text-gray-200
                      focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20
                      transition-colors
                    "
                    placeholder="Min 10 characters"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-xs text-gray-500 uppercase tracking-wider">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="
                      w-full bg-black border border-dark-border rounded px-3 py-2
                      font-mono text-sm text-gray-200
                      focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20
                      transition-colors
                    "
                    placeholder="••••••••••"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setPhase('login'); setNewPassword(''); setConfirmPassword(''); }}
                    className="
                      flex-1 font-mono text-xs uppercase tracking-widest py-2 rounded border
                      border-dark-border text-gray-500 hover:border-gray-500 hover:text-gray-300
                      transition-all duration-150
                    "
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !newPassword || !confirmPassword}
                    className="
                      flex-1 font-mono text-xs uppercase tracking-widest py-2 rounded border
                      border-yellow-500/60 text-yellow-400
                      hover:bg-yellow-500 hover:text-dark-bg
                      disabled:opacity-40 disabled:cursor-not-allowed
                      transition-all duration-150
                    "
                  >
                    {loading ? '[ CHANGING... ]' : '[ SET PASSWORD ]'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center font-mono text-xs text-gray-700">
          Unauthorized access is prohibited and monitored.
        </p>
      </div>
    </div>
  );
}

