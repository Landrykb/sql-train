/**
 * Pyodide runtime helpers for BleepxLab.
 *
 * Responsibilities:
 *   1. Load Pyodide once and cache the instance.
 *   2. Detect `import` statements in user code and lazily install the
 *      matching packages (matplotlib, seaborn, scipy, statsmodels, plotly…)
 *      so the Lab "just works" without users hitting
 *      "ModuleNotFoundError: No module named 'matplotlib'".
 *   3. Run user code with stdout/stderr captured and, when matplotlib is
 *      in use, capture any open figures as base64 PNG images so they can
 *      be rendered inline in the terminal output.
 */

export type OutputLine =
  | { type: 'stdout'; text: string }
  | { type: 'stderr'; text: string }
  | { type: 'result'; text: string }
  | { type: 'system'; text: string }
  | { type: 'image'; mime: string; data: string }
  | { type: 'html'; html: string }
  | { type: 'error-help'; text: string };

export interface RunResult {
  stdout: string;
  stderr: string;
  /** String representation of the last-expression value (like Jupyter's `Out[n]`). */
  result: unknown;
  /** Trusted HTML representation — populated when the last expression was a
   *  pandas DataFrame/Series (rendered via `_repr_html_()`). Safe to inject
   *  because it comes from our own pandas inside Pyodide; still sanitized
   *  downstream in case user code overrides `_repr_html_`. */
  resultHtml?: string;
  images: Array<{ mime: string; data: string }>;
}

// ─── Pyodide singleton ──────────────────────────────────────────────────────

let pyodidePromise: Promise<any> | null = null;

const PYODIDE_VERSION = 'v0.25.1';
const PYODIDE_INDEX = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`;

/** Load Pyodide on demand. Re-uses a cached promise so concurrent callers
 *  share the same download. */
export function loadPyodide(
  onProgress?: (msg: string) => void,
): Promise<any> {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = new Promise(async (resolve, reject) => {
    try {
      if (!(window as any).loadPyodide) {
        onProgress?.('Loading Python runtime…');
        const script = document.createElement('script');
        script.src = `${PYODIDE_INDEX}pyodide.js`;
        script.async = true;
        await new Promise<void>((res, rej) => {
          script.onload = () => res();
          script.onerror = () => rej(new Error('Failed to load Pyodide'));
          document.head.appendChild(script);
        });
      }
      onProgress?.('Initializing Python…');
      const pyodide = await (window as any).loadPyodide({ indexURL: PYODIDE_INDEX });
      // Core packages everyone needs. Others are loaded lazily on-import.
      onProgress?.('Loading numpy / pandas…');
      await pyodide.loadPackage(['numpy', 'pandas', 'micropip']);
      resolve(pyodide);
    } catch (err) {
      pyodidePromise = null;
      reject(err);
    }
  });
  return pyodidePromise;
}

// ─── Package auto-loader ────────────────────────────────────────────────────

/**
 * Map of `import X` → install plan.
 *
 * `loadPackage` entries use Pyodide's pre-built wheels (fast, reliable).
 * `micropip` entries hit PyPI for pure-Python packages not shipped with Pyodide.
 *
 * Keep this list curated: only packages that are known to work in Pyodide.
 */
const IMPORT_ALIASES: Record<string, { loadPackage?: string[]; micropip?: string[] }> = {
  // Pre-built wheels in Pyodide
  matplotlib: { loadPackage: ['matplotlib'] },
  scipy: { loadPackage: ['scipy'] },
  sklearn: { loadPackage: ['scikit-learn'] },
  statsmodels: { loadPackage: ['statsmodels'] },
  networkx: { loadPackage: ['networkx'] },
  sympy: { loadPackage: ['sympy'] },
  nltk: { loadPackage: ['nltk'] },
  pillow: { loadPackage: ['Pillow'] },
  PIL: { loadPackage: ['Pillow'] },
  bokeh: { loadPackage: ['bokeh'] },
  // Seaborn depends on matplotlib + scipy which we also load.
  seaborn: { loadPackage: ['matplotlib', 'scipy'], micropip: ['seaborn'] },
  // Plotly is pure-Python on PyPI.
  plotly: { micropip: ['plotly'] },
  // Prophet is heavy and not fully supported in Pyodide — skip it; user code
  // that imports it will fail with a helpful error.
};

/** Track which packages have already been installed so we don't re-fetch. */
const installedPackages = new Set<string>();

/** Extract top-level module names from `import x` / `from x import …` lines. */
export function detectImportedModules(code: string): string[] {
  const seen = new Set<string>();
  const re = /^[\t ]*(?:from|import)[\t ]+([a-zA-Z_][a-zA-Z0-9_]*)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    seen.add(m[1]);
  }
  return Array.from(seen);
}

/** Install any Pyodide packages needed by the imports in `code`. */
export async function ensurePackagesForCode(
  pyodide: any,
  code: string,
  onProgress?: (msg: string) => void,
): Promise<void> {
  const modules = detectImportedModules(code);
  const toLoad = new Set<string>();
  const toMicropip = new Set<string>();
  for (const mod of modules) {
    const plan = IMPORT_ALIASES[mod];
    if (!plan) continue;
    for (const p of plan.loadPackage || []) {
      if (!installedPackages.has(p)) toLoad.add(p);
    }
    for (const p of plan.micropip || []) {
      if (!installedPackages.has(p)) toMicropip.add(p);
    }
  }
  if (toLoad.size) {
    onProgress?.(`Installing: ${Array.from(toLoad).join(', ')}…`);
    await pyodide.loadPackage(Array.from(toLoad));
    toLoad.forEach((p) => installedPackages.add(p));
  }
  if (toMicropip.size) {
    onProgress?.(`Fetching from PyPI: ${Array.from(toMicropip).join(', ')}…`);
    const micropip = pyodide.pyimport('micropip');
    for (const p of toMicropip) {
      try {
        await micropip.install(p);
        installedPackages.add(p);
      } catch (err) {
        // Non-fatal: user code will surface the ImportError with context.
        // eslint-disable-next-line no-console
        console.warn(`[pyodide] micropip install ${p} failed:`, err);
      }
    }
  }
}

// ─── Code runner ────────────────────────────────────────────────────────────

/** Python preamble that wires matplotlib to a non-interactive backend and
 *  installs a stub `plt.show()` so figures are queued for later capture. */
const MATPLOTLIB_PRELUDE = `
import sys as _sys
try:
    import matplotlib as _mpl
    _mpl.use('AGG')
    import matplotlib.pyplot as _plt
    # Replace show() with a no-op — we capture figures after code runs.
    _plt.show = lambda *a, **kw: None
except Exception:
    pass
`;

/** Python snippet that captures currently-open matplotlib figures as base64
 *  PNGs and returns a Python list of data URIs. */
const MATPLOTLIB_CAPTURE = `
def _bleepx_capture_figures():
    import io, base64
    out = []
    try:
        import matplotlib.pyplot as _plt
    except Exception:
        return out
    for num in list(_plt.get_fignums()):
        fig = _plt.figure(num)
        buf = io.BytesIO()
        try:
            fig.savefig(buf, format='png', bbox_inches='tight', dpi=100)
            out.append(base64.b64encode(buf.getvalue()).decode('ascii'))
        finally:
            _plt.close(fig)
    return out
_bleepx_capture_figures()
`;

export interface RunOptions {
  code: string;
  timeoutMs?: number;
  onProgress?: (msg: string) => void;
}

export async function runPythonCode(
  pyodide: any,
  { code, timeoutMs = 30000, onProgress }: RunOptions,
): Promise<RunResult> {
  // Lazy-install any required packages first.
  await ensurePackagesForCode(pyodide, code, onProgress);

  const usesMatplotlib =
    /\bimport\s+matplotlib\b/.test(code) ||
    /\bfrom\s+matplotlib\b/.test(code) ||
    /\bimport\s+seaborn\b/.test(code) ||
    /\bfrom\s+seaborn\b/.test(code);

  const exec = (async (): Promise<RunResult> => {
    // Fresh stdout/stderr capture. Do NOT leak across runs.
    pyodide.runPython(
      'import sys\nfrom io import StringIO\n_stdout = StringIO()\n_stderr = StringIO()\nsys.stdout = _stdout\nsys.stderr = _stderr\n',
    );
    if (usesMatplotlib) {
      pyodide.runPython(MATPLOTLIB_PRELUDE);
    }

    let result: any;
    let resultHtml: string | undefined;
    let runError: Error | null = null;
    try {
      // Pyodide returns the value of the trailing expression. When it is a
      // `PyProxy` (e.g. pandas DataFrame/Series), we pull `_repr_html_()` and
      // the string repr *before* destroying the proxy so the UI can render a
      // rich HTML table Jupyter-style.
      const pyResult = pyodide.runPython(code);
      if (pyResult !== undefined && pyResult !== null) {
        try {
          if (typeof (pyResult as any)._repr_html_ === 'function') {
            const html = (pyResult as any)._repr_html_();
            if (typeof html === 'string' && html.length > 0) resultHtml = html;
          }
        } catch { /* ignore */ }
        try {
          result = String(pyResult);
        } catch { result = undefined; }
        try { (pyResult as any).destroy?.(); } catch { /* ignore */ }
      } else {
        result = pyResult;
      }
    } catch (err: any) {
      runError = new Error(err?.message || String(err));
    }

    const stdout = pyodide.runPython('_stdout.getvalue()') as string;
    const stderr = pyodide.runPython('_stderr.getvalue()') as string;

    // Capture matplotlib figures even if the main code threw, so partial
    // plots created before the exception are still shown.
    let images: Array<{ mime: string; data: string }> = [];
    if (usesMatplotlib) {
      try {
        const pyList = pyodide.runPython(MATPLOTLIB_CAPTURE);
        const arr: string[] = pyList?.toJs ? pyList.toJs() : [];
        if (pyList?.destroy) pyList.destroy();
        images = (arr || []).map((b64) => ({ mime: 'image/png', data: b64 }));
      } catch {
        /* ignore capture failures */
      }
    }

    // Restore streams.
    pyodide.runPython('sys.stdout = sys.__stdout__\nsys.stderr = sys.__stderr__\n');

    if (runError) {
      // Prefer the richer Python traceback we captured via _stderr.
      const combined = stderr ? `${stderr}\n${runError.message}` : runError.message;
      const e = new Error(combined);
      (e as any).images = images;
      (e as any).stdout = stdout;
      throw e;
    }
    return { stdout, stderr, result, resultHtml, images };
  })();

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Execution timed out after ${timeoutMs / 1000} seconds. Check for infinite loops.`)),
      timeoutMs,
    ),
  );

  return Promise.race([exec, timeout]);
}
