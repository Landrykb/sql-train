'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function BleepxLogo() {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <Link href="/" className="text-bleepx-blue font-bold inline-block h-8 leading-8 hover:opacity-80 transition-opacity cursor-pointer">B</Link>
    );
  }

  return (
    <Link href="/" className="hover:opacity-80 transition-opacity cursor-pointer">
      <img
        src="/bleepx-logo.png"
        alt="BleepxQuery — Go Home"
        className="h-8 animate-bleepx-logo"
        onError={() => {
          console.error('Failed to load /bleepx-logo.png');
          setError(true);
        }}
      />
    </Link>
  );
}