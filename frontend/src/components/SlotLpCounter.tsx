'use client';

import React, { useEffect, useState, useMemo } from 'react';

interface SlotLpCounterProps {
  value: number;
  showSign?: boolean;
  prefix?: string;
  suffix?: string;
  className?: string;
  direction?: 'up' | 'down' | 'auto';
  reelDurationMs?: number;
  staggerMs?: number;
  formatThousands?: boolean;
}

// 3 repeating cycles of digits 0-9 to allow reels to spin through multiple numbers
const DIGIT_CYCLE = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const REEL_DIGITS = [
  ...DIGIT_CYCLE,
  ...DIGIT_CYCLE,
  ...DIGIT_CYCLE,
]; // 30 items

function SingleDigitReel({
  digit,
  colIndex,
  isAnimating,
  direction = 'up',
  reelDurationMs = 750,
  staggerMs = 70,
}: {
  digit: number;
  colIndex: number;
  isAnimating: boolean;
  direction?: 'up' | 'down';
  reelDurationMs?: number;
  staggerMs?: number;
}) {
  // When direction is 'up', strip translates from -digit to -(20 + digit) (rolling UPWARDS)
  // When direction is 'down', strip translates from -(20 + digit) to -digit (rolling DOWNWARDS)
  const fromIndex = direction === 'down' ? 20 + digit : digit;
  const toIndex = direction === 'down' ? digit : 20 + digit;
  const currentIndex = isAnimating ? toIndex : fromIndex;

  const delayMs = colIndex * staggerMs;

  return (
    <span
      className="relative inline-flex overflow-hidden h-[1.2em] align-baseline select-none tabular-nums font-mono"
      style={{ verticalAlign: '-0.15em' }}
    >
      {/* Invisible placeholder for natural layout width and height */}
      <span className="invisible opacity-0 pointer-events-none select-none px-[0.5px]">
        {digit}
      </span>

      <span
        className="absolute inset-0 flex flex-col items-center"
        style={{
          transform: `translateY(-${(currentIndex / REEL_DIGITS.length) * 100}%)`,
          transition: isAnimating
            ? `transform ${reelDurationMs}ms cubic-bezier(0.12, 0.8, 0.32, 1) ${delayMs}ms`
            : 'none',
          willChange: isAnimating ? 'transform' : 'auto',
        }}
      >
        {REEL_DIGITS.map((d, i) => (
          <span
            key={i}
            className="h-[1.2em] flex items-center justify-center leading-none shrink-0"
          >
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

export default function SlotLpCounter({
  value,
  showSign = false,
  prefix = '',
  suffix = '',
  className = '',
  direction = 'auto',
  reelDurationMs = 750,
  staggerMs = 80,
  formatThousands = false,
}: SlotLpCounterProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const resolvedDirection = useMemo<'up' | 'down'>(() => {
    if (direction === 'auto') {
      return value < 0 ? 'down' : 'up';
    }
    return direction;
  }, [direction, value]);

  // Trigger spin on mount or when value changes
  useEffect(() => {
    setIsAnimating(false);
    const frame = requestAnimationFrame(() => {
      const timer = setTimeout(() => {
        setIsAnimating(true);
      }, 30);
      return () => clearTimeout(timer);
    });
    return () => cancelAnimationFrame(frame);
  }, [value, resolvedDirection]);

  const { sign, chars } = useMemo(() => {
    let s = '';
    if (showSign) {
      if (value > 0) s = '+';
      else if (value < 0) s = '-';
    } else if (value < 0) {
      s = '-';
    }

    const absVal = Math.abs(value);
    const numStr = formatThousands ? absVal.toLocaleString() : String(absVal);
    const cList = numStr.split('');

    return { sign: s, chars: cList };
  }, [value, showSign, formatThousands]);

  let digitColCounter = 0;

  return (
    <span className={`inline-flex items-baseline tabular-nums ${className}`}>
      {prefix && <span>{prefix}</span>}
      {sign && <span className="mr-[1px]">{sign}</span>}
      {chars.map((char, index) => {
        const isDigit = /^[0-9]$/.test(char);
        if (isDigit) {
          const col = digitColCounter++;
          return (
            <SingleDigitReel
              key={`${index}-${char}`}
              digit={parseInt(char, 10)}
              colIndex={col}
              isAnimating={isAnimating}
              direction={resolvedDirection}
              reelDurationMs={reelDurationMs}
              staggerMs={staggerMs}
            />
          );
        }
        return (
          <span key={`${index}-${char}`} className="select-none">
            {char}
          </span>
        );
      })}
      {suffix && <span>{suffix}</span>}
    </span>
  );
}
