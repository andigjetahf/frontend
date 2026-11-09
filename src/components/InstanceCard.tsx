'use client';

import React from 'react';
import type { Instance, InstanceStatus } from '@/types';
import CountdownTimer from './CountdownTimer';
import clsx from 'clsx';

interface Props {
  instance: Instance;
  onStop: () => void;
  onExtend: () => void;
  stopping?: boolean;
  extending?: boolean;
}

function StatusBadge({ status }: { status: InstanceStatus }) {
  const styles: Record<InstanceStatus, string> = {
    PROVISIONING: 'border-cyber-cyan text-cyber-cyan animate-pulse',
    RUNNING: 'border-cyber-green text-cyber-green',
    STOPPING: 'border-cyber-yellow text-cyber-yellow animate-pulse',
    STOPPED: 'border-gray-500 text-gray-500',
    EXPIRED: 'border-cyber-red text-cyber-red',
    FAILED: 'border-cyber-red text-cyber-red',
  };
  return (
    <span
      className={clsx(
        'font-mono text-xs uppercase tracking-widest border rounded px-2 py-0.5',
        styles[status]
      )}
    >
      {status}
    </span>
  );
}

export default function InstanceCard({
  instance,
  onStop,
  onExtend,
  stopping = false,
  extending = false,
}: Props) {
  const isRunning = instance.status === 'RUNNING';
  const isStopping = instance.status === 'STOPPING' || stopping;

  return (
    <div className="border border-cyber-green/30 bg-dark-card rounded-lg p-5 shadow-cyber space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold text-gray-200 text-base">
            {instance.challenge?.name ?? 'Challenge Environment'}
          </span>
          <StatusBadge status={instance.status} />
        </div>
        {instance.challenge && (
          <span className="font-mono text-xs text-gray-500">
            {instance.challenge.category} ·{' '}
            <span className="text-cyber-cyan">{instance.challenge.points} pts</span>
          </span>
        )}
      </div>

      {/* Host URL */}
      {isRunning && instance.hostUrl && (
        <div className="bg-dark-bg border border-dark-border rounded p-3">
          <p className="font-mono text-xs text-gray-500 mb-1 uppercase tracking-widest">
            Target URL
          </p>
          <a
            href={instance.hostUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-cyber-cyan text-sm hover:underline break-all"
          >
            {instance.hostUrl}
          </a>
        </div>
      )}

      {/* Stats */}
      {instance.stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-dark-bg border border-dark-border rounded p-3">
            <p className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-1">
              CPU Usage
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-dark-border rounded-full overflow-hidden">
                <div
                  className={clsx(
                    'h-full rounded-full',
                    instance.stats.cpuPercent > 80
                      ? 'bg-cyber-red'
                      : instance.stats.cpuPercent > 50
                      ? 'bg-cyber-yellow'
                      : 'bg-cyber-green'
                  )}
                  style={{ width: `${Math.min(100, instance.stats.cpuPercent)}%` }}
                />
              </div>
              <span className="font-mono text-xs text-gray-300 tabular-nums w-12 text-right">
                {instance.stats.cpuPercent.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="bg-dark-bg border border-dark-border rounded p-3">
            <p className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-1">
              RAM Usage
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-dark-border rounded-full overflow-hidden">
                <div
                  className={clsx(
                    'h-full rounded-full',
                    instance.stats.memoryMB / instance.stats.memoryLimitMB > 0.8
                      ? 'bg-cyber-red'
                      : instance.stats.memoryMB / instance.stats.memoryLimitMB > 0.5
                      ? 'bg-cyber-yellow'
                      : 'bg-cyber-cyan'
                  )}
                  style={{
                    width: `${Math.min(
                      100,
                      (instance.stats.memoryMB / instance.stats.memoryLimitMB) * 100
                    )}%`,
                  }}
                />
              </div>
              <span className="font-mono text-xs text-gray-300 tabular-nums w-20 text-right">
                {instance.stats.memoryMB}
                <span className="text-gray-500">/{instance.stats.memoryLimitMB}MB</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Countdown */}
      {(isRunning || instance.status === 'PROVISIONING') && instance.expiresAt && (
        <CountdownTimer expiresAt={instance.expiresAt} />
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={onExtend}
          disabled={extending || isStopping || !isRunning}
          className={clsx(
            'flex-1 font-mono text-xs uppercase tracking-widest py-2 rounded border transition-all duration-150',
            isRunning && !extending && !isStopping
              ? 'border-cyber-cyan/50 text-cyber-cyan hover:bg-cyber-cyan hover:text-dark-bg'
              : 'border-dark-border text-gray-600 cursor-not-allowed'
          )}
        >
          {extending ? '[ EXTENDING... ]' : '[ +30 MIN ]'}
        </button>
        <button
          onClick={onStop}
          disabled={isStopping || !isRunning}
          className={clsx(
            'flex-1 font-mono text-xs uppercase tracking-widest py-2 rounded border transition-all duration-150',
            isRunning && !isStopping
              ? 'border-cyber-red/50 text-cyber-red hover:bg-cyber-red hover:text-dark-bg'
              : 'border-dark-border text-gray-600 cursor-not-allowed'
          )}
        >
          {isStopping ? '[ STOPPING... ]' : '[ STOP ]'}
        </button>
      </div>

      {/* Meta */}
      <div className="flex gap-4 text-xs font-mono text-gray-600 border-t border-dark-border pt-3">
        <span>
          STARTED: {new Date(instance.createdAt).toLocaleTimeString()}
        </span>
        <span>|</span>
        <span>ID: {instance.id.slice(0, 8)}…</span>
      </div>
    </div>
  );
}
