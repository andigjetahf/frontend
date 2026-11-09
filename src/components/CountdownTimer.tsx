'use client';

import React, { useEffect } from 'react';
import { useCountdown } from '@/hooks/useCountdown';
import clsx from 'clsx';

interface Props {
  expiresAt: string;
  onExpired?: () => void;
}

export default function CountdownTimer({ expiresAt, onExpired }: Props) {
  const { timeLeft, isExpired, percentLeft } = useCountdown(expiresAt);

  useEffect(() => {
    if (isExpired && onExpired) onExpired();
  }, [isExpired, onExpired]);

  const barColor =
    percentLeft > 50
      ? 'bg-cyber-green'
      : percentLeft > 20
      ? 'bg-cyber-yellow'
      : 'bg-cyber-red';

  const textColor =
    percentLeft > 50
      ? 'text-cyber-green'
      : percentLeft > 20
      ? 'text-cyber-yellow'
      : 'text-cyber-red';

  const glowColor =
    percentLeft > 50
      ? 'shadow-cyber'
      : percentLeft > 20
      ? 'shadow-[0_0_10px_rgba(255,215,0,0.4)]'
      : 'shadow-cyber-red';

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* Time display */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-gray-500 uppercase tracking-widest">
          Time Remaining
        </span>
        <span
          className={clsx(
            'font-mono text-sm font-bold tabular-nums',
            textColor,
            isExpired && 'animate-pulse'
          )}
        >
          {isExpired ? 'EXPIRED' : timeLeft}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-dark-border rounded-full overflow-hidden">
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-1000 ease-linear',
            barColor,
            glowColor
          )}
          style={{ width: `${percentLeft}%` }}
        />
      </div>

      {/* Percent label */}
      <div className="flex items-center justify-end">
        <span className={clsx('font-mono text-xs', textColor)}>
          {Math.round(percentLeft)}% left
        </span>
      </div>
    </div>
  );
}
