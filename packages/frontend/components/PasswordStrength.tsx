'use client';

import { useMemo } from 'react';

// Password strength — required rules gate account creation, recommended
// rules drive the meter. Returns score 0-5 + per-rule pass/fail.
export interface PasswordCheck {
  score: number;          // 0-5
  ok: boolean;            // all required rules pass
  rules: { label: string; pass: boolean; required: boolean }[];
}

const COMMON = ['password', '123456', '12345678', 'qwerty', 'letmein', 'admin', 'iloveyou', 'welcome'];

export function checkPassword(pw: string, email?: string): PasswordCheck {
  const emailPart = (email || '').split('@')[0].toLowerCase();
  const rules = [
    { label: 'At least 8 characters', pass: pw.length >= 8, required: true },
    { label: 'Not a common password', pass: pw.length > 0 && !COMMON.includes(pw.toLowerCase()), required: true },
    { label: 'Does not contain your email', pass: !emailPart || emailPart.length < 3 || !pw.toLowerCase().includes(emailPart), required: true },
    { label: 'A number', pass: /\d/.test(pw), required: false },
    { label: 'An uppercase letter', pass: /[A-Z]/.test(pw), required: false },
    { label: 'A symbol (!@#$…)', pass: /[^A-Za-z0-9]/.test(pw), required: false },
  ];
  const score = rules.filter(r => r.pass).length;
  return { score, ok: rules.filter(r => r.required).every(r => r.pass), rules };
}

const COLORS = ['bg-red-500', 'bg-orange-500', 'bg-amber-400', 'bg-lime-500', 'bg-emerald-500', 'bg-emerald-500'];
const LABELS = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Strong'];

export default function PasswordStrength({ password, email }: { password: string; email?: string }) {
  const check = useMemo(() => checkPassword(password, email), [password, email]);
  if (!password) return null;

  return (
    <div className="px-1 py-1">
      <div className="flex gap-1 mb-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < check.score ? COLORS[check.score] : 'bg-bleepx-border'}`} />
        ))}
      </div>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[11px] font-bold ${check.score >= 4 ? 'text-emerald-600' : check.score >= 3 ? 'text-amber-600' : 'text-red-500'}`}>
          {LABELS[check.score]}
        </span>
      </div>
      <ul className="space-y-0.5">
        {check.rules.map((r) => (
          <li key={r.label} className={`flex items-center gap-1.5 text-[11px] ${r.pass ? 'text-emerald-600' : 'text-bleepx-text-secondary'}`}>
            {r.pass ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/></svg>
            )}
            {r.label}{r.required && !r.pass ? ' — required' : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}
