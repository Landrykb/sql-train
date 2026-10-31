// Anonymous-progress nudge — after a guest's 2nd real completion, fire a
// one-per-session event so the UI can offer sign-up. Honest framing: guest
// progress is real but lives only in this browser.
export function noteGuestCompletion(): void {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem('bleepx_progress_owner')) return; // signed-in — no nudge
    const n = parseInt(localStorage.getItem('bleepx_guest_solves') || '0', 10) + 1;
    localStorage.setItem('bleepx_guest_solves', String(n));
    if (n >= 2 && !sessionStorage.getItem('bleepx_nudge_shown')) {
      sessionStorage.setItem('bleepx_nudge_shown', '1');
      window.dispatchEvent(new Event('bleepx:signup_nudge'));
    }
  } catch { /* ignore */ }
}
