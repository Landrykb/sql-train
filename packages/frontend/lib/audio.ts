/**
 * Safe audio playback helper.
 * Catches NotSupportedError when the audio file is missing or unsupported.
 */
export function playBleep(): void {
  try {
    const audio = new Audio('/bleep.mp3');
    audio.play().catch(() => {
      // Silently ignore — file may not exist or browser may block autoplay
    });
  } catch {
    // Ignore construction errors
  }
}
