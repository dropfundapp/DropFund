import { useEffect, useRef, useState } from 'react';

export function useAnimatedBalance(balance: number | null, durationMs = 650) {
  const [displayBalance, setDisplayBalance] = useState<number | null>(balance);
  const previousBalanceRef = useRef<number | null>(balance);
  const hasInitializedRef = useRef(balance !== null);

  useEffect(() => {
    if (balance === null) {
      hasInitializedRef.current = false;
      previousBalanceRef.current = null;
      setDisplayBalance(null);
      return;
    }

    if (!hasInitializedRef.current || previousBalanceRef.current === null) {
      hasInitializedRef.current = true;
      previousBalanceRef.current = balance;
      setDisplayBalance(balance);
      return;
    }

    const startBalance = previousBalanceRef.current;
    if (startBalance === balance) return;

    const startedAt = performance.now();
    let frameId = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayBalance(startBalance + (balance - startBalance) * eased);
      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        previousBalanceRef.current = balance;
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [balance, durationMs]);

  return displayBalance;
}