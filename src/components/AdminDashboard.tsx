'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { AdminOverview, Instance, ScoreboardEntry } from '@/types';
import { getAdminOverview, getAllInstances, killInstance, getScoreboard } from '@/lib/backendApi';
import Scoreboard from './Scoreboard';
import clsx from 'clsx';

const POLL_INTERVAL_MS = 15_000;

function StatCard({
  label,
  value,
  accent = 'green',
}: {
  label: string;
  value: number | string;
  accent?: 'green' | 'cyan' | 'red' | 'yellow';
}) {
  const color = {
    green: 'text-cyber-green border-cyber-green/30',
    cyan: 'text-cyber-cyan border-cyber-cyan/30',
    red: 'text-cyber-red border-cyber-red/30',
    yellow: 'text-cyber-yellow border-cyber-yellow/30',
  }[accent];

  return (
    <div className={clsx('border bg-dark-card rounded-lg p-4', color)}>
      <p className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={clsx('font-mono text-3xl font-bold', color.split(' ')[0])}>{value}</p>
    </div>
  );
}

function InstanceStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    RUNNING: 'text-cyber-green border-cyber-green/40',
    PROVISIONING: 'text-cyber-cyan border-cyber-cyan/40 animate-pulse',
    STOPPING: 'text-cyber-yellow border-cyber-yellow/40 animate-pulse',
    STOPPED: 'text-gray-500 border-gray-600',
    EXPIRED: 'text-cyber-red border-cyber-red/40',
    FAILED: 'text-cyber-red border-cyber-red/40',
  };
  return (
    <span
      className={clsx(
        'font-mono text-xs border rounded px-2 py-0.5 uppercase',
        map[status] ?? 'text-gray-400 border-gray-600'
      )}
    >
      {status}
    </span>
  );
}

export default function AdminDashboard() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [scoreboard, setScoreboard] = useState<ScoreboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [killing, setKilling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [ov, inst, sb] = await Promise.all([
        getAdminOverview(),
        getAllInstances(),
        getScoreboard(),
      ]);
      setOverview(ov);
      setInstances(inst);
      setScoreboard(sb);
    } catch {
      if (!silent) setError('Failed to load admin data.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    pollRef.current = setInterval(() => fetchAll(true), POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchAll]);

  const handleKill = async (id: string) => {
    setKilling(id);
    try {
      await killInstance(id);
      setInstances((prev) => prev.filter((i) => i.id !== id));
    } catch {
      setError(`Failed to kill instance ${id.slice(0, 8)}.`);
    } finally {
      setKilling(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-8 h-8 border-2 border-cyber-cyan border-t-transparent rounded-full animate-spin" />
        <span className="font-mono text-cyber-cyan text-sm animate-pulse">
          Loading admin panel...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Error */}
      {error && (
        <div className="border border-cyber-red/40 bg-cyber-red/10 rounded p-3 font-mono text-cyber-red text-sm">
          ⚠ {error}
        </div>
      )}

      {/* Overview cards */}
      {overview && (
        <section>
          <h2 className="font-mono text-cyber-cyan text-xs uppercase tracking-widest mb-3">
            ▶ System Overview
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Users" value={overview.totalUsers} accent="green" />
            <StatCard label="Active Instances" value={overview.activeInstances} accent="cyan" />
            <StatCard label="Challenges" value={overview.challengesCount} accent="yellow" />
            <StatCard label="Recent Submissions" value={overview.recentSubmissions} accent="green" />
          </div>
        </section>
      )}

      {/* Instances table */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-mono text-cyber-cyan text-xs uppercase tracking-widest">
            ▶ All Instances
          </h2>
          <button
            onClick={() => fetchAll()}
            className="font-mono text-xs text-gray-500 hover:text-cyber-cyan transition-colors uppercase tracking-widest"
          >
            [ REFRESH ]
          </button>
        </div>

        <div className="border border-dark-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-dark-card border-b border-dark-border">
                <tr>
                  {['User', 'Challenge', 'Status', 'CPU %', 'RAM', 'Expires', 'Actions'].map(
                    (h) => (
                      <th
                        key={h}
                        className="font-mono text-xs text-gray-500 uppercase tracking-widest px-4 py-3"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {instances.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="font-mono text-gray-600 text-sm text-center px-4 py-8"
                    >
                      No active instances.
                    </td>
                  </tr>
                ) : (
                  instances.map((inst) => (
                    <tr
                      key={inst.id}
                      className="border-b border-dark-border hover:bg-dark-hover transition-colors duration-100"
                    >
                      <td className="font-mono text-gray-300 text-sm px-4 py-3">
                        {inst.userId.slice(0, 8)}…
                      </td>
                      <td className="font-mono text-gray-300 text-sm px-4 py-3">
                        {inst.challenge?.name ?? inst.challengeId.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3">
                        <InstanceStatusBadge status={inst.status} />
                      </td>
                      <td className="font-mono text-sm px-4 py-3">
                        {inst.stats ? (
                          <span
                            className={clsx(
                              inst.stats.cpuPercent > 80
                                ? 'text-cyber-red'
                                : inst.stats.cpuPercent > 50
                                ? 'text-cyber-yellow'
                                : 'text-cyber-green'
                            )}
                          >
                            {inst.stats.cpuPercent.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="font-mono text-sm px-4 py-3">
                        {inst.stats ? (
                          <span className="text-cyber-cyan">
                            {inst.stats.memoryMB}
                            <span className="text-gray-600">/{inst.stats.memoryLimitMB}MB</span>
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="font-mono text-xs text-gray-400 px-4 py-3 tabular-nums">
                        {new Date(inst.expiresAt).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleKill(inst.id)}
                          disabled={killing === inst.id}
                          className={clsx(
                            'font-mono text-xs uppercase tracking-widest px-3 py-1 rounded border transition-all duration-150',
                            killing === inst.id
                              ? 'border-dark-border text-gray-600 cursor-not-allowed'
                              : 'border-cyber-red/40 text-cyber-red hover:bg-cyber-red hover:text-dark-bg'
                          )}
                        >
                          {killing === inst.id ? '...' : '[ KILL ]'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Scoreboard */}
      <section>
        <h2 className="font-mono text-cyber-cyan text-xs uppercase tracking-widest mb-3">
          ▶ Scoreboard
        </h2>
        <Scoreboard entries={scoreboard} />
      </section>
    </div>
  );
}
