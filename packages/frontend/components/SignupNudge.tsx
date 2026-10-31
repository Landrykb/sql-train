'use client';

import { useEffect, useState } from 'react';
import SignInGate from './SignInGate';

// Global listener — opens the sign-in gate (GitHub + email) when a guest's
// progress warrants the save-prompt. Mounted once in the root layout.
export default function SignupNudge() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onNudge = () => setOpen(true);
    window.addEventListener('bleepx:signup_nudge', onNudge);
    return () => window.removeEventListener('bleepx:signup_nudge', onNudge);
  }, []);
  return <SignInGate open={open} onClose={() => setOpen(false)} action="keep the progress you just earned" />;
}
