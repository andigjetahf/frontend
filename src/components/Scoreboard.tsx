'use client';

import React from 'react';
import type { ScoreboardEntry } from '@/types';
import clsx from 'clsx';

interface Props {
  entries: ScoreboardEntry[];
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return <span className="text-cyber-yellow font-bold font-mono text-base">🥇</span>;
  if (rank === 2)
    return <span className="text-gray-300 font-bold font-mono text-base">🥈</span>;
  if (rank === 3)
    return <span className="text-amber-600 font-bold font-mono text-base">🥉</span>;
  return <span className="font-mono text-gray-500 text-sm tabular-nums">#{rank}</span>;
}

export default function Scoreboard({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="border border-dark-border rounded-lg p-8 text-center font-mono text-gray-600 text-sm">
        No scores yet. Be the first to solve a challenge.
      </div>
    );
  }

  return (
    <div className="border border-dark-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-dark-card border-b border-dark-border">
            <tr>
              {['Rank', 'Player', 'Solved', 'Points'].map((h) => (
                <th
                  key={h}
                  className="font-mono text-xs text-gray-500 uppercase tracking-widest px-4 py-3"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const isTop3 = entry.rank <= 3;
              return (
                <tr
                  key={entry.userId}
                  className={clsx(
                    'border-b border-dark-border transition-colors duration-100',
                    entry.rank === 1 && 'bg-cyber-yellow/5 hover:bg-cyber-yellow/10',
                    entry.rank === 2 && 'bg-gray-500/5 hover:bg-gray-500/10',
                    entry.rank === 3 && 'bg-amber-600/5 hover:bg-amber-600/10',
                    !isTop3 && 'hover:bg-dark-hover'
                  )}
                >
                  <td className="px-4 py-3 w-16">
                    <RankBadge rank={entry.rank} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span
                        className={clsx(
                          'font-mono text-sm font-semibold',
                          entry.rank === 1
                            ? 'text-cyber-yellow'
                            : entry.rank === 2
                            ? 'text-gray-300'
                            : entry.rank === 3
                            ? 'text-amber-600'
                            : 'text-gray-200'
                        )}
                      >
                        {entry.displayName}
                      </span>
                      <span className="font-mono text-xs text-gray-600">
                        @{entry.username}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-cyber-cyan tabular-nums">
                      {entry.solvedCount}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        'font-mono text-sm font-bold tabular-nums',
                        entry.rank === 1
                          ? 'text-cyber-yellow'
                          : entry.rank <= 3
                          ? 'text-cyber-green'
                          : 'text-cyber-green/70'
                      )}
                    >
                      {entry.totalPoints.toLocaleString()}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
