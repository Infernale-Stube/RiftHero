'use client';

import React, { useEffect, useState } from 'react';

interface SlotLpCounterProps {
  value: number;
  showSign?: boolean;
  prefix?: string;
  suffix?: string;
  className?: string;
  durationMs?: number;
  animate?: boolean;
}

export default function SlotLpCounter({
  value,
  showSign = false,
  prefix = '',
  suffix = '',
  className = '',
  durationMs = 750,
  animate = true,
}: SlotLpCounterProps) {
  // If animation is disabled (not a new LP change), render final static value directly
  const [displayValue, setDisplayValue] = useState<number>(animate ? 0 : value);

  useEffect(() => {
    if (!animate) {
      setDisplayValue(value);
      return;
    }

    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const startValue = 0;
    const endValue = value;
    const diff = endValue - startValue;

    if (diff === 0) {
      setDisplayValue(value);
      return;
    }

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / durationMs, 1);

      // Decelerating cubic easing (fast start, gradual deceleration into target value)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + diff * easeOut);

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(endValue);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value, durationMs, animate]);

  const sign = showSign && displayValue > 0 ? '+' : '';
  const text = `${prefix}${sign}${displayValue}${suffix}`;

  return (
    <span className={`inline-block tabular-nums select-none ${className}`}>
      {text}
    </span>
  );
}
