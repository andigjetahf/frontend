'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Challenge, Instance } from '@/types';
import {
  getChallenges,
  getMyInstance,
  startInstance,
  stopInstance,
  extendInstance,
} from '@/lib/backendApi';
import InstanceCard from './InstanceCard';
import clsx from 'clsx';

const POLL_INTERVAL_MS = 10_000;

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const styles: Record<string, string> = {
    EASY: 'text-cyber-green border-cyber-green/40',
    MEDIUM: 'text-cyber-yellow border-cyber-yellow/40',
    HARD: 'text-cyber-red border-cyber-red/40',
    INSANE: 'text-purple-400 border-purple-400/40',
  };
  const key = difficulty.toUpperCase();
  return (
    <span
      className={clsx(
        'font-mono text-xs border rounded px-2 py-0.5 uppercase',
        styles[key] ?? 'text-gray-400 border-gray-600'
      )}
    >
      {difficulty}
    </span>
  );
}

export default function UserDashboard() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [instance, setInstance] = useState<Instance | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [extending, setExtending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoadingData(true);
    setError(null);
    try {
      const [cList, inst] = await Promise.all([getChallenges(), getMyInstance()]);
      setChallenges(cList);
      setInstance(inst);
    } catch {
      if (!silent) setError('Failed to load data from backend.');
    } finally {
      if (!silent) setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    pollRef.current = setInterval(() => fetchData(true), POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchData]);

  const handleStart = async (challengeId: string) => {
    setStarting(true);
    setError(null);
    setSelectedChallenge(challengeId);
    try {
      const inst = await startInstance(challengeId);
      setInstance(inst);
    } catch {
      setError('Failed to start instance. Please try again.');
    } finally {
      setStarting(false);
      setSelectedChallenge(null);
    }
  };

  const handleStop = async () => {
    setStopping(true);
    setError(null);
    try {
      await stopInstance();
      await fetchData(true);
    } catch {
      setError('Failed to stop instance.');
    } finally {
      setStopping(false);
    }
  };

  const handleExtend = async () => {
    setExtending(true);
    setError(null);
    try {
      const updated = await extendInstance();
      setInstance(updated);
    } catch {
      setError('Failed to extend instance.');
    } finally {
      setExtending(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-8 h-8 border-2 border-cyber-green border-t-transparent rounded-full animate-spin" />
        <span className="font-mono text-cyber-green text-sm animate-pulse">
          Initializing terminal...
        </span>
      </div>
    );
  }

  const hasActiveInstance =
    instance &&
    (instance.status === 'RUNNING' ||
      instance.status === 'PROVISIONING' ||
      instance.status === 'STOPPING');

  const safeChallenges = Array.isArray(challenges) ? challenges : [];

  return (
    <div className="space-y-8">
      {/* Error */}
      {error && (
        <div className="border border-cyber-red/40 bg-cyber-red/10 rounded p-3 font-mono text-cyber-red text-sm">
          ⚠ {error}
        </div>
      )}

      {/* Active instance section */}
      {hasActiveInstance && instance ? (
        <section>
          <h2 className="font-mono text-cyber-green text-xs uppercase tracking-widest mb-3">
            ▶ Active Environment
          </h2>
          {instance.status === 'PROVISIONING' ? (
            <div className="border border-cyber-cyan/30 bg-dark-card rounded-lg p-6 flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-cyber-cyan border-t-transparent rounded-full animate-spin" />
              <p className="font-mono text-cyber-cyan text-sm animate-pulse">
                Provisioning your environment...
              </p>
              <p className="font-mono text-gray-500 text-xs">
                This may take 30–60 seconds
              </p>
            </div>
          ) : (
            <InstanceCard
              instance={instance}
              onStop={handleStop}
              onExtend={handleExtend}
              stopping={stopping}
              extending={extending}
            />
          )}
        </section>
      ) : (
        /* Challenge cards */
        <section>
          <h2 className="font-mono text-cyber-green text-xs uppercase tracking-widest mb-3">
            ▶ Available Challenges
          </h2>
          {safeChallenges.length === 0 ? (
            <p className="font-mono text-gray-500 text-sm">
              No challenges available. Check back later.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {safeChallenges.map((ch) => (
                <div
                  key={ch.id}
                  className="
                    border border-dark-border bg-dark-card rounded-lg p-4 space-y-3
                    hover:border-cyber-green/40 transition-colors duration-150
                  "
                >
                  {/* Category tag */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-cyber-cyan uppercase tracking-wider">
                      {ch.category}
                    </span>
                    <DifficultyBadge difficulty={ch.difficulty} />
                  </div>

                  {/* Name + Description */}
                  <div>
                    <h3 className="font-mono font-bold text-gray-200 text-sm mb-1">
                      {ch.name}
                    </h3>
                    <p className="font-mono text-gray-500 text-xs line-clamp-3">
                      {ch.description}
                    </p>
                  </div>

                  {/* Points */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono text-cyber-green text-sm font-bold">
                      {ch.points} pts
                    </span>
                  </div>

                  {/* Launch button */}
                  <button
                    onClick={() => handleStart(ch.id)}
                    disabled={starting}
                    className={clsx(
                      'w-full font-mono text-xs uppercase tracking-widest py-2 rounded border transition-all duration-150',
                      starting && selectedChallenge === ch.id
                        ? 'border-cyber-green/50 text-cyber-green animate-pulse cursor-wait'
                        : starting
                        ? 'border-dark-border text-gray-600 cursor-not-allowed'
                        : 'border-cyber-green/50 text-cyber-green hover:bg-cyber-green hover:text-dark-bg'
                    )}
                  >
                    {starting && selectedChallenge === ch.id
                      ? '[ LAUNCHING... ]'
                      : '[ START ENVIRONMENT ]'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
