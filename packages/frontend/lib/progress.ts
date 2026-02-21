/** Safely read completed case IDs; returns empty Set on server or malformed JSON. */
export function getCompletedCases(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem('completed') ?? '[]';
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    console.error('Failed to parse completed cases from localStorage');
    return new Set();
  }
}

/** Mark one case done and persist immediately. */
export function markCaseComplete(caseId: string): void {
  if (typeof window === 'undefined') return;
  const done = getCompletedCases();
  if (done.has(caseId)) return;
  done.add(caseId);
  try {
    localStorage.setItem('completed', JSON.stringify([...done].sort()));
  } catch (e: unknown) {
    console.error('Failed to save progress: localStorage quota exceeded', e);
    window.dispatchEvent(
      new CustomEvent('progress-error', { detail: 'Failed to save progress.' })
    );
  }
}

/** True if *all* prerequisites appear in the completed Set. */
export function isUnlocked(prereqs: string[]): boolean {
  if (typeof window === 'undefined') return false;
  const done = getCompletedCases();
  return prereqs.every((id) => done.has(id));
}

/** Clear all progress from localStorage. */
export function resetProgress(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('completed');
  } catch (e: unknown) {
    console.error('Failed to reset progress', e);
  }
}

/** Export progress as a JSON string for portability. */
export function exportProgress(): string {
  if (typeof window === 'undefined') return '[]';
  try {
    return localStorage.getItem('completed') || '[]';
  } catch (e: unknown) {
    console.error('Failed to export progress', e);
    return '[]';
  }
}

/** Import progress from a JSON string. */
export function importProgress(data: string): void {
  if (typeof window === 'undefined') return;
  try {
    const arr = JSON.parse(data) as string[];
    if (!Array.isArray(arr)) throw new Error('Invalid progress data');
    localStorage.setItem('completed', JSON.stringify(arr));
  } catch (e: unknown) {
    console.error('Failed to import progress', e);
  }
}