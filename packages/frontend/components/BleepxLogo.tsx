'use client';

import React, { useState } from 'react';

export default function BleepxLogo() {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <span className="text-bleepx-blue font-bold inline-block h-8 leading-8">B</span>
    );
  }

  return (
    <img
      src="/bleepx-logo.png"
      alt="BleepxQuery"
      className="h-8 animate-bleepx-logo"
      onError={() => {
        console.error('Failed to load /bleepx-logo.png');
        setError(true);
      }}
    />
  );
}