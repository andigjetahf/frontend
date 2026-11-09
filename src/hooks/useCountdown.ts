import { useEffect, useRef, useState } from 'react';

const INSTANCE_TTL_MINUTES = 60;
const INSTANCE_TTL_MS = INSTANCE_TTL_MINUTES * 60 * 1000;

interface CountdownResult {
  timeLeft: string;
  isExpired: boolean;
  percentLeft: number;
}

function formatTime(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((v) => String(v).padStart(2, '0'))
    .join(':');
}

export function useCountdown(expiresAt: string): CountdownResult {
  const expiresMs = useRef(new Date(expiresAt).getTime());

  const getRemaining = () => expiresMs.current - Date.now();

  const [remaining, setRemaining] = useState<number>(getRemaining);

  useEffect(() => {
    expiresMs.current = new Date(expiresAt).getTime();
    setRemaining(getRemaining());

    const interval = setInterval(() => {
      const r = getRemaining();
      setRemaining(r);
      if (r <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  const isExpired = remaining <= 0;
  const timeLeft = formatTime(remaining);
  const percentLeft = isExpired
    ? 0
    : Math.min(100, Math.max(0, (remaining / INSTANCE_TTL_MS) * 100));

  return { timeLeft, isExpired, percentLeft };
}
