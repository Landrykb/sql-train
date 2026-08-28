'use client';

import React, { useState, useEffect } from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

const CYAN = '#57ECF4';
const TEAL = '#0DB5BE';

function useBleepxColors() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains('dark'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return {
    DARK: dark ? '#4B5563' : '#1C2129',
    DARK2: dark ? '#6B7280' : '#2B333C',
  };
}

// ─── Bleepx Face: just eyes + smirk (inline in messages, tooltips) ───
export function BleepxFace({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      {/* Left eye */}
      <path d="M8 12 L13 10 L14 14 L9 15 Z" fill={CYAN} />
      {/* Right eye */}
      <path d="M19 12 L24 10 L23 15 L18 14 Z" fill={CYAN} />
      {/* Smirk */}
      <path d="M12 19 Q16 23 21 19" stroke={CYAN} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ─── Bleepx Head: face inside hooded head + antenna ───
export function BleepxHead({ size = 32, className = '' }: IconProps) {
  const { DARK, DARK2 } = useBleepxColors();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      {/* Antenna curl */}
      <path d="M24 4 Q27 2 26 6 Q25 10 24 12" stroke={DARK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Hood/head */}
      <ellipse cx="24" cy="26" rx="16" ry="18" fill={DARK} />
      {/* Face area */}
      <ellipse cx="24" cy="25" rx="12" ry="13" fill={DARK2} />
      {/* Left eye */}
      <path d="M15 22 L20 20 L21 25 L16 26 Z" fill={CYAN} opacity="0.9" />
      {/* Right eye */}
      <path d="M27 22 L32 20 L31 26 L26 25 Z" fill={CYAN} opacity="0.9" />
      {/* Smirk */}
      <path d="M19 30 Q24 34 29 30" stroke={CYAN} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

// ─── Bleepx Ghost: full body ghost shape ───
export function BleepxGhost({ size = 48, className = '' }: IconProps) {
  const { DARK, DARK2 } = useBleepxColors();
  return (
    <svg width={size} height={size} viewBox="0 0 64 80" fill="none" className={className} aria-hidden="true">
      {/* Antenna */}
      <path d="M32 4 Q36 1 35 7 Q34 12 32 16" stroke={DARK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Body */}
      <path d="M32 16 C16 16 8 28 8 42 C8 56 12 68 20 76 Q24 80 28 74 Q32 80 36 74 Q40 80 44 76 C52 68 56 56 56 42 C56 28 48 16 32 16Z" fill={DARK} />
      {/* Face area */}
      <ellipse cx="32" cy="34" rx="14" ry="14" fill={DARK2} />
      {/* Left eye */}
      <path d="M22 31 L28 29 L29 34 L23 35 Z" fill={CYAN} />
      {/* Right eye */}
      <path d="M35 31 L41 29 L40 35 L34 34 Z" fill={CYAN} />
      {/* Smirk */}
      <path d="M26 39 Q32 44 38 39" stroke={CYAN} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Code braces on chest */}
      <text x="24" y="60" fill={TEAL} fontSize="12" fontFamily="monospace" fontWeight="bold">&#123;&#125;</text>
    </svg>
  );
}

// ─── Bleepx Wave: waving hand with signal arcs ───
export function BleepxWave({ size = 48, className = '' }: IconProps) {
  const { DARK, DARK2 } = useBleepxColors();
  return (
    <svg width={size} height={size} viewBox="0 0 72 80" fill="none" className={className} aria-hidden="true">
      {/* Antenna */}
      <path d="M30 6 Q34 2 33 8 Q32 13 30 16" stroke={DARK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Body */}
      <path d="M30 16 C14 16 6 28 6 42 C6 56 10 68 18 76 Q22 80 26 74 Q30 80 34 74 Q38 80 42 76 C50 68 54 56 54 42 C54 28 46 16 30 16Z" fill={DARK} />
      {/* Face area */}
      <ellipse cx="30" cy="34" rx="14" ry="14" fill={DARK2} />
      {/* Left eye */}
      <path d="M20 31 L26 29 L27 34 L21 35 Z" fill={CYAN} />
      {/* Right eye */}
      <path d="M33 31 L39 29 L38 35 L32 34 Z" fill={CYAN} />
      {/* Smirk */}
      <path d="M24 39 Q30 44 36 39" stroke={CYAN} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Waving hand */}
      <ellipse cx="54" cy="34" rx="5" ry="6" fill={DARK} transform="rotate(-15 54 34)" />
      {/* Signal arcs */}
      <path d="M62 28 Q66 34 62 40" stroke={DARK} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M66 25 Q72 34 66 43" stroke={DARK} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ─── Bleepx Think: with thought dots ───
export function BleepxThink({ size = 48, className = '' }: IconProps) {
  const { DARK, DARK2 } = useBleepxColors();
  return (
    <svg width={size} height={size} viewBox="0 0 72 64" fill="none" className={className} aria-hidden="true">
      {/* Antenna */}
      <path d="M28 4 Q32 1 31 7 Q30 12 28 14" stroke={DARK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Head */}
      <ellipse cx="28" cy="32" rx="20" ry="22" fill={DARK} />
      {/* Face */}
      <ellipse cx="28" cy="31" rx="15" ry="15" fill={DARK2} />
      {/* Left eye — squinting/thinking */}
      <path d="M18 28 L24 27 L23 32 L17 31 Z" fill={CYAN} opacity="0.7" />
      {/* Right eye */}
      <path d="M32 28 L38 27 L37 32 L31 31 Z" fill={CYAN} opacity="0.7" />
      {/* Thinking mouth — flat line */}
      <path d="M22 37 L34 37" stroke={CYAN} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      {/* Thought bubbles */}
      <circle cx="54" cy="20" r="2.5" fill={DARK} opacity="0.4" />
      <circle cx="60" cy="14" r="3.5" fill={DARK} opacity="0.5" />
      <circle cx="67" cy="7" r="5" fill={DARK} opacity="0.6" />
    </svg>
  );
}

// ─── Bleepx Code: with SQL/code symbol on chest ───
export function BleepxCode({ size = 40, className = '', label = 'SQL' }: IconProps & { label?: string }) {
  const { DARK, DARK2 } = useBleepxColors();
  const x = label.length <= 2 ? 18 : 15;
  return (
    <svg width={size} height={size} viewBox="0 0 48 56" fill="none" className={className} aria-hidden="true">
      {/* Antenna */}
      <path d="M24 3 Q27 1 26 5 Q25 9 24 11" stroke={DARK} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Body */}
      <path d="M24 11 C12 11 6 21 6 32 C6 43 9 50 15 55 Q19 56 21 52 Q24 56 27 52 Q29 56 33 55 C39 50 42 43 42 32 C42 21 36 11 24 11Z" fill={DARK} />
      {/* Face */}
      <ellipse cx="24" cy="24" rx="11" ry="11" fill={DARK2} />
      {/* Eyes */}
      <path d="M17 22 L21 20.5 L22 24 L18 25 Z" fill={CYAN} />
      <path d="M26 22 L30 20.5 L29 25 L25 24 Z" fill={CYAN} />
      {/* Smirk */}
      <path d="M19 28 Q24 31 29 28" stroke={CYAN} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* Code text on chest */}
      <text x={x} y="45" fill={TEAL} fontSize="9" fontFamily="monospace" fontWeight="bold">{label.slice(0, 3)}</text>
    </svg>
  );
}

// ─── Bleepx Lock: for locked/gated content ───
export function BleepxLock({ size = 32, className = '' }: IconProps) {
  const { DARK, DARK2 } = useBleepxColors();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      {/* Antenna */}
      <path d="M24 3 Q27 1 26 5 Q25 9 24 11" stroke={DARK} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Head */}
      <ellipse cx="24" cy="26" rx="16" ry="18" fill={DARK} />
      {/* Face */}
      <ellipse cx="24" cy="25" rx="12" ry="13" fill={DARK2} />
      {/* X eyes — locked/denied */}
      <path d="M16 21 L21 26 M21 21 L16 26" stroke={CYAN} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <path d="M27 21 L32 26 M32 21 L27 26" stroke={CYAN} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      {/* Flat mouth */}
      <path d="M19 32 L29 32" stroke={CYAN} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

// ─── Bleepx Trophy: for achievements/completion ───
export function BleepxTrophy({ size = 40, className = '' }: IconProps) {
  const { DARK, DARK2 } = useBleepxColors();
  return (
    <svg width={size} height={size} viewBox="0 0 56 64" fill="none" className={className} aria-hidden="true">
      {/* Antenna */}
      <path d="M28 6 Q31 3 30 8 Q29 13 28 15" stroke={DARK} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Head */}
      <ellipse cx="28" cy="30" rx="16" ry="18" fill={DARK} />
      {/* Face */}
      <ellipse cx="28" cy="29" rx="12" ry="13" fill={DARK2} />
      {/* Happy eyes — arched */}
      <path d="M19 25 Q22 21 25 25" stroke={CYAN} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M31 25 Q34 21 37 25" stroke={CYAN} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Big smile */}
      <path d="M22 33 Q28 38 34 33" stroke={CYAN} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Star above */}
      <path d="M28 0 L29.5 3 L33 3.5 L30.5 5.5 L31 9 L28 7.5 L25 9 L25.5 5.5 L23 3.5 L26.5 3 Z" fill="#FFD700" />
    </svg>
  );
}

// ─── Bleepx Spark: small decorative accent ───
export function BleepxSpark({ size = 16, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M8 1 L9 6 L14 7 L9 9 L8 14 L7 9 L2 7 L7 6 Z" fill={CYAN} opacity="0.6" />
    </svg>
  );
}

// ─── Bleepx Signal: wifi/broadcast arcs ───
export function BleepxSignal({ size = 20, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="18" r="2" fill={TEAL} />
      <path d="M7 14 Q12 9 17 14" stroke={TEAL} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M4 10 Q12 3 20 10" stroke={TEAL} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

// ─── Bleepx Eye: single glowing eye ───
export function BleepxEye({ size = 16, className = '' }: IconProps) {
  const { DARK } = useBleepxColors();
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M2 7 L8 4 L14 7 L8 12 Z" fill={CYAN} opacity="0.8" />
      <circle cx="8" cy="7.5" r="1.5" fill={DARK} />
    </svg>
  );
}

// ─── Bleepx Git: ghost with "Git" on chest (portfolio export) ───
export function BleepxGit({ size = 40, className = '' }: IconProps) {
  const { DARK, DARK2 } = useBleepxColors();
  return (
    <svg width={size} height={size} viewBox="0 0 48 56" fill="none" className={className} aria-hidden="true">
      {/* Antenna */}
      <path d="M24 3 Q27 1 26 5 Q25 9 24 11" stroke={DARK} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Body */}
      <path d="M24 11 C12 11 6 21 6 32 C6 43 9 50 15 55 Q19 56 21 52 Q24 56 27 52 Q29 56 33 55 C39 50 42 43 42 32 C42 21 36 11 24 11Z" fill={DARK} />
      {/* Face */}
      <ellipse cx="24" cy="24" rx="11" ry="11" fill={DARK2} />
      {/* Eyes */}
      <path d="M17 22 L21 20.5 L22 24 L18 25 Z" fill={CYAN} />
      <path d="M26 22 L30 20.5 L29 25 L25 24 Z" fill={CYAN} />
      {/* Smirk */}
      <path d="M19 28 Q24 31 29 28" stroke={CYAN} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* Git text on chest */}
      <text x="14.5" y="45" fill={TEAL} fontSize="10" fontFamily="monospace" fontWeight="bold">Git</text>
    </svg>
  );
}

// ─── Bleepx GitHub: BleepX head with branch/merge symbol ───
export function BleepxGitHub({ size = 32, className = '' }: IconProps) {
  const { DARK, DARK2 } = useBleepxColors();
  return (
    <svg width={size} height={size} viewBox="0 0 56 48" fill="none" className={className} aria-hidden="true">
      {/* Antenna */}
      <path d="M20 4 Q23 2 22 6 Q21 10 20 12" stroke={DARK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Head */}
      <ellipse cx="20" cy="26" rx="16" ry="18" fill={DARK} />
      {/* Face */}
      <ellipse cx="20" cy="25" rx="12" ry="13" fill={DARK2} />
      {/* Eyes */}
      <path d="M11 22 L16 20 L17 25 L12 26 Z" fill={CYAN} opacity="0.9" />
      <path d="M23 22 L28 20 L27 26 L22 25 Z" fill={CYAN} opacity="0.9" />
      {/* Smirk */}
      <path d="M15 30 Q20 34 25 30" stroke={CYAN} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.8" />
      {/* Git branch symbol beside head */}
      <circle cx="44" cy="14" r="2.5" fill={TEAL} />
      <circle cx="44" cy="28" r="2.5" fill={TEAL} />
      <circle cx="52" cy="21" r="2.5" fill={TEAL} />
      <line x1="44" y1="16.5" x2="44" y2="25.5" stroke={TEAL} strokeWidth="2" strokeLinecap="round" />
      <path d="M44 20 Q44 21 52 18.5" stroke={TEAL} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
