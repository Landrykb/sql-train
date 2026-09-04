'use client';

import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import dynamic from 'next/dynamic';
import DOMPurify from 'dompurify';
import { getPyErrorHelp } from '@/lib/pyErrorHelper';
import { useTheme } from '@/lib/useTheme';
import { BleepxFace } from '@/components/BleepxIcons';
import { CodeIcon, RefreshIcon, MoonIcon, SunIcon, BulbIcon, EyeIcon, EyeOffIcon, EraserIcon, ErrorIcon, ClockIcon, PlayIcon, ResetIcon } from '@/components/AppIcons';
import { useAuthGate } from '@/components/SignInGate';
import { track, Events } from '@/lib/analytics';
import { loadPyodide, runPythonCode, type OutputLine } from '@/lib/pyodideRuntime';

// ─── Types ──────────────────────────────────────────────────────────────

interface PythonTerminalProps {
  initialCode?: string;
  expectedOutput?: string;
  solutionCode?: string;
  hints?: string[];
  onSolved?: () => void;
  height?: string;
}

/** Imperative handle — lets parents (e.g. LabProjectViewer) inject code into
 *  the editor from outside ("Send to editor" buttons on section snippets). */
export interface PythonTerminalHandle {
  setCode: (code: string) => void;
  appendCode: (code: string) => void;
  getCode: () => string;
}

// ─── CodeMirror (dynamic) ───────────────────────────────────────────────────

const CodeMirrorFallback: React.FC = () => (
  <textarea
    className="w-full h-[250px] border-0 p-4 text-sm font-mono bg-gray-900 text-gray-100 outline-none resize-none"
    placeholder="# Write your Python code here..."
    aria-label="Python code editor fallback"
  />
);

const CodeMirror = dynamic(
  async () => {
    try {
      const { default: CM } = await import('@uiw/react-codemirror');
      const { python } = await import('@codemirror/lang-python');
      const { oneDark } = await import('@codemirror/theme-one-dark');
      return (props: any & { isDark?: boolean }) => {
        const { isDark, ...rest } = props;
        const pyExt = python();
        const exts = isDark ? [pyExt, oneDark] : [pyExt];
        return <CM {...rest} basicSetup extensions={exts} theme={isDark ? 'dark' : 'light'} />;
      };
    } catch (err) {
      console.error('Failed to load CodeMirror:', err);
      return CodeMirrorFallback;
    }
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8 bg-gray-900">
        <div className="animate-spin w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full mr-2" />
        <span className="text-gray-400 text-sm">Loading editor...</span>
      </div>
    ),
  }
);

// ─── Editor theme options ───────────────────────────────────────────────────

type EditorTheme = 'auto' | 'dark' | 'light';

// ─── Component ───────────────────────────────────────────────────────

const PythonTerminal = forwardRef<PythonTerminalHandle, PythonTerminalProps>(function PythonTerminal({
  initialCode = '',
  expectedOutput,
  solutionCode,
  hints = [],
  onSolved,
  height = '250px',
}, ref) {
  const [code, setCode] = useState(initialCode);
  useEffect(() => { setCode(initialCode); }, [initialCode]);
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [running, setRunning] = useState(false);
  const [pyodideReady, setPyodideReady] = useState(false);
  const [loadingPyodide, setLoadingPyodide] = useState(false);
  const [hintIdx, setHintIdx] = useState(-1);
  const [showSolution, setShowSolution] = useState(false);
  const [solved, setSolved] = useState(false);
  const [editorTheme, setEditorTheme] = useState<EditorTheme>('auto');
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [errorHelp, setErrorHelp] = useState<ReturnType<typeof getPyErrorHelp> | null>(null);
  const [execCount, setExecCount] = useState(0);
  const outputRef = useRef<HTMLDivElement>(null);
  const { dark: systemDark } = useTheme();
  const { requireAuth, GateComponent } = useAuthGate();

  const isDark = editorTheme === 'auto' ? systemDark : editorTheme === 'dark';

  // Imperative handle for parent-driven code injection (e.g. "Send to editor").
  useImperativeHandle(ref, () => ({
    setCode: (next: string) => setCode(next),
    appendCode: (next: string) => setCode((prev) => (prev ? `${prev.replace(/\s+$/, '')}\n\n${next}` : next)),
    getCode: () => code,
  }), [code]);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  // Ensure Pyodide is ready, returns the pyodide instance or null
  const ensurePyodide = useCallback(async (): Promise<any | null> => {
    if (pyodideReady) return loadPyodide();
    setLoadingPyodide(true);
    setOutput([{ type: 'system', text: '*bleep* Loading Python environment (first time may take ~10s)…' }]);
    try {
      const py = await loadPyodide((msg) => {
        setOutput([{ type: 'system', text: `*bleep* ${msg}` }]);
      });
      setPyodideReady(true);
      setLoadingPyodide(false);
      return py;
    } catch (err: any) {
      setOutput([{ type: 'stderr', text: `Failed to load Python: ${err.message}` }]);
      setLoadingPyodide(false);
      return null;
    }
  }, [pyodideReady]);

  // Run code with timeout + auto package install + matplotlib capture.
  const runCode = useCallback(async () => {
    if (running) return;
    // Gate: require GitHub sign-in to execute code
    if (!requireAuth('run Python code')) return;
    track(Events.LAB_RUN_PYTHON);
    setErrorHelp(null);
    setRunning(true);
    const nextCell = execCount + 1;
    setExecCount(nextCell);

    try {
      const pyodide = await ensurePyodide();
      if (!pyodide) { setRunning(false); return; }

      const prompt = `In [${nextCell}]: ${code.replace(/\s+/g, ' ').slice(0, 80)}${code.length > 80 ? '…' : ''}`;
      setOutput((prev) => [...prev, { type: 'prompt', text: prompt, cell: nextCell }]);

      const { stdout, stderr, result, resultHtml, images } = await runPythonCode(pyodide, {
        code,
        timeoutMs: 30000,
        onProgress: (msg) => {
          setOutput((prev) => [...prev, { type: 'system', text: `*bleep* ${msg}`, cell: nextCell }]);
        },
      });

      const newOutput: OutputLine[] = [];
      if (stdout) newOutput.push({ type: 'stdout', text: stdout, cell: nextCell });
      if (stderr) newOutput.push({ type: 'stderr', text: stderr, cell: nextCell });
      // Prefer rich HTML (pandas DataFrame/Series/Styler) over the plain repr.
      if (resultHtml) {
        // nosemgrep: DOMPurify strips scripts / event handlers — pandas HTML contains only
        // <table>/<thead>/<tr>/<td> so this is safe to render.
        const safe = DOMPurify.sanitize(resultHtml, { USE_PROFILES: { html: true } });
        newOutput.push({ type: 'html', html: safe, cell: nextCell });
      } else if (result !== undefined && result !== null && String(result) !== 'None') {
        newOutput.push({ type: 'result', text: String(result), cell: nextCell });
      }
      for (const img of images) {
        newOutput.push({ type: 'image', mime: img.mime, data: img.data, cell: nextCell });
      }
      if (newOutput.length === 0) {
        newOutput.push({ type: 'system', text: '(no output)', cell: nextCell });
      }
      setOutput((prev) => [...prev, ...newOutput]);

      // Check if solved
      if (expectedOutput) {
        const actualOutput = (stdout || '').trim();
        const expected = expectedOutput.trim();
        const isMatch = expected.split('\n').every((line: string) =>
          actualOutput.includes(line.trim()) || actualOutput.replace(/\s+/g, ' ').includes(line.trim().replace(/\s+/g, ' '))
        );
        // Don't mark as solved if the code printed an error/traceback to stderr,
        // even if stdout happens to contain the expected text.
        // Warnings (e.g. ConvergenceWarning) are not failures.
        const hasError = (stderr || '').trim().length > 0 && /\b(Error|Exception|Traceback)\b/i.test(stderr);
        if (isMatch && !solved && !hasError) {
          setSolved(true);
          setOutput((prev) => [...prev, { type: 'system', text: '*bleep* Correct! Output matches. Points earned, human.', cell: nextCell }]);
          onSolved?.();
        }
      }
    } catch (err: any) {
      const rawError = err.message || String(err);
      // Partial images captured before the error (if any) are stashed on err
      const partialImages: Array<{ mime: string; data: string }> = Array.isArray(err?.images) ? err.images : [];
      const partialStdout: string = typeof err?.stdout === 'string' ? err.stdout : '';
      setOutput((prev) => [
        ...prev,
        ...(partialStdout ? [{ type: 'stdout', text: partialStdout, cell: nextCell } as OutputLine] : []),
        { type: 'stderr', text: rawError, cell: nextCell },
        ...partialImages.map((img) => ({ type: 'image', mime: img.mime, data: img.data, cell: nextCell } as OutputLine)),
      ]);
      setErrorHelp(getPyErrorHelp(rawError, code));
    } finally {
      setRunning(false);
    }
  }, [code, running, ensurePyodide, expectedOutput, solved, onSolved, requireAuth, execCount]);

  const clearOutput = () => { setOutput([]); setErrorHelp(null); };

  const resetEditor = () => {
    if (code === initialCode) return;
    if (typeof window !== 'undefined' && !window.confirm('Reset the editor to the starter code? Your changes will be lost.')) return;
    setCode(initialCode);
  };

  const showNextHint = () => {
    if (hintIdx < hints.length - 1) setHintIdx((i) => i + 1);
  };

  const cycleTheme = () => {
    setEditorTheme((prev) => prev === 'auto' ? 'dark' : prev === 'dark' ? 'light' : 'auto');
  };

  return (
    <div className={`rounded-xl border overflow-hidden shadow-sm transition-colors ${
      isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-300 bg-white'
    }`}>
      {/* Toolbar — mobile: stacks label on top, buttons wrap below; desktop: single row */}
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-2 border-b ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'
      }`}>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
          <span className={`text-xs font-bold ml-1 inline-flex items-center gap-1 ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>
            <CodeIcon size={12} /> Python
          </span>
          {solved && (
            <span className="text-xs font-bold text-green-500 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30">
              Solved
            </span>
          )}
        </div>
        {/* Button row — wraps on mobile, Run button always last so it stays visible */}
        <div className="flex items-center flex-wrap gap-1.5 justify-end">
          {/* Theme toggle */}
          <button
            onClick={cycleTheme}
            className={`px-2 py-1 text-xs font-bold rounded transition-colors whitespace-nowrap ${
              isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
            title={`Theme: ${editorTheme}`}
          >
            {editorTheme === 'auto' ? <RefreshIcon size={10} /> : editorTheme === 'dark' ? <MoonIcon size={10} /> : <SunIcon size={10} />}
            <span className="hidden sm:inline ml-0.5">{editorTheme === 'auto' ? 'Auto' : editorTheme === 'dark' ? 'Dark' : 'Light'}</span>
          </button>
          {hints.length > 0 && (
            <button
              onClick={showNextHint}
              disabled={hintIdx >= hints.length - 1}
              className={`px-2 py-1 text-xs font-bold rounded transition-colors disabled:opacity-40 whitespace-nowrap ${
                isDark ? 'bg-amber-900/40 text-amber-300 hover:bg-amber-900/60' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              }`}
            >
              <span className="inline-flex items-center gap-1"><BulbIcon size={10} /><span className="hidden sm:inline"> Hint</span> ({Math.max(0, hintIdx + 1)}/{hints.length})</span>
            </button>
          )}
          {solutionCode && (
            <button
              onClick={() => setShowSolution(!showSolution)}
              className={`px-2 py-1 text-xs font-bold rounded transition-colors whitespace-nowrap ${
                isDark ? 'bg-purple-900/40 text-purple-300 hover:bg-purple-900/60' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              }`}
            >
              <span className="inline-flex items-center gap-1">{showSolution ? <EyeOffIcon size={10} /> : <EyeIcon size={10} />}<span className="hidden sm:inline"> {showSolution ? 'Hide' : 'Solution'}</span></span>
            </button>
          )}
          <button
            onClick={resetEditor}
            disabled={code === initialCode}
            title="Restore starter code"
            className={`px-2 py-1 text-xs font-bold rounded transition-colors whitespace-nowrap disabled:opacity-40 ${
              isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            <span className="inline-flex items-center gap-1"><ResetIcon size={10} /><span className="hidden sm:inline ml-0.5">Reset</span></span>
          </button>
          <button
            onClick={clearOutput}
            className={`px-2 py-1 text-xs font-bold rounded transition-colors whitespace-nowrap ${
              isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            <span className="inline-flex items-center gap-1"><EraserIcon size={10} /><span className="hidden sm:inline"> Clear</span></span>
          </button>
          <button
            onClick={runCode}
            disabled={running || !code.trim()}
            className="px-3 py-1.5 text-xs font-bold rounded bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 transition-colors disabled:opacity-40 flex items-center gap-1 whitespace-nowrap shadow-md"
          >
            {running ? <span className="inline-flex items-center gap-1"><ClockIcon size={10} /> Running...</span> : <span className="inline-flex items-center gap-1"><PlayIcon size={10} /> Run</span>}
            <span className="text-xs opacity-70 hidden sm:inline">(⌘↵)</span>
          </button>
        </div>
      </div>

      {/* Hint display */}
      {hintIdx >= 0 && (
        <div className={`px-3 py-2 border-b text-xs flex items-start gap-2 ${
          isDark ? 'bg-amber-900/20 border-amber-800 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <span className="flex-shrink-0"><BulbIcon size={14} /></span>
          <span><strong>Hint {hintIdx + 1}:</strong> {hints[hintIdx]}</span>
        </div>
      )}

      {/* Solution display */}
      {showSolution && solutionCode && (
        <div className={`px-3 py-2 border-b ${
          isDark ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-200'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-bold ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>Solution Code:</span>
            <button
              onClick={() => setCode(solutionCode)}
              className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
                isDark ? 'bg-purple-800 text-purple-200 hover:bg-purple-700' : 'bg-purple-200 text-purple-700 hover:bg-purple-300'
              }`}
            >
              Copy to Editor
            </button>
          </div>
          <pre className="text-xs bg-gray-900 text-gray-100 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all font-mono max-w-full"><code>{solutionCode}</code></pre>
        </div>
      )}

      {/* Code editor — CodeMirror with Python syntax highlighting */}
      <div className="max-w-full overflow-x-auto min-w-0">
        <CodeMirror
        value={code}
        onChange={(val: string) => setCode(val)}
        isDark={isDark}
        height={height}
        style={{ maxWidth: '100%' }}
        className="max-w-full min-w-0"
        placeholder="# Write your Python code here...
# Press ⌘+Enter (Ctrl+Enter) to run

import pandas as pd
import numpy as np"
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            runCode();
          }
        }}
        />
      </div>

      {/* Error help panel — like BleepxQuery's sqlErrorHelper */}
      {errorHelp && (
        <div className={`border-t px-4 py-3 ${
          isDark ? 'bg-red-950/40 border-red-800' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start gap-2.5">
            <BleepxFace size={20} />
            <div className="flex-1 min-w-0">
              <h4 className={`text-sm font-bold ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                {errorHelp.title}
              </h4>
              <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-red-200/80' : 'text-red-600'}`}>
                {errorHelp.explanation}
              </p>
              <ul className="mt-2 space-y-1">
                {errorHelp.suggestions.map((s, i) => (
                  <li key={i} className={`text-xs flex items-start gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <span className="text-teal-500 mt-0.5 flex-shrink-0">→</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => setErrorHelp(null)}
              className={`text-xs flex-shrink-0 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <ErrorIcon size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Output — Jupyter-notebook-style: text, matplotlib PNGs, and results
          are interleaved in the order they were produced. */}
      <div
        ref={outputRef}
        className={`border-t p-0 font-mono text-xs overflow-auto max-h-[28rem] min-h-[80px] ${
          isDark ? 'bg-gray-950 border-gray-700' : 'bg-gray-900 border-gray-300'
        }`}
      >
        {output.length === 0 ? (
          <div className="p-3 text-gray-500 italic">*bleep* Output will appear here after running your code. Figures from matplotlib/seaborn render inline.</div>
        ) : (
          output.map((line, i) => {
            const cell = line.cell;
            const label = cell !== undefined
              ? (line.type === 'prompt' ? `In [${cell}]:` : `Out[${cell}]:`)
              : '';
            const border =
              line.type === 'stderr' ? 'border-red-500' :
              line.type === 'html' || line.type === 'image' ? 'border-blue-400' :
              line.type === 'result' ? 'border-yellow-400' :
              line.type === 'prompt' ? 'border-emerald-400' :
              'border-gray-600';
            const textColor =
              line.type === 'stderr' ? 'text-red-400' :
              line.type === 'system' ? 'text-teal-400 italic' :
              line.type === 'result' ? 'text-yellow-300' :
              line.type === 'prompt' ? 'text-emerald-300' :
              'text-gray-200';

            if (line.type === 'image') {
              return (
                <div key={i} className="p-3 border-l-4 border-blue-400">
                  {label && <div className="text-xs text-blue-300 mb-1">{label}</div>}
                  <div className="rounded-md overflow-hidden bg-white p-2 inline-block max-w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:${line.mime};base64,${line.data}`}
                      alt="Figure output"
                      className="block max-w-full h-auto"
                    />
                  </div>
                </div>
              );
            }
            if (line.type === 'html') {
              return (
                <div key={i} className={`p-3 border-l-4 ${border}`}>
                  {label && <div className="text-xs text-blue-300 mb-1">{label}</div>}
                  {/* nosemgrep: line.html is sanitized with DOMPurify before injection. */}
                  <div
                    className="bleepx-df rounded-md overflow-auto bg-white text-gray-900 p-2 max-w-full"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(line.html) }}
                  />
                </div>
              );
            }
            if (line.type === 'prompt') {
              return (
                <div key={i} className="p-2 border-l-4 border-emerald-400 bg-emerald-900/10">
                  <div className="text-xs text-emerald-300 font-bold">{label}</div>
                  <div className="text-emerald-300 text-xs font-mono whitespace-pre-wrap">{line.text.slice(`In [${cell}]: `.length)}</div>
                </div>
              );
            }
            return (
              <div key={i} className={`p-2 border-l-4 ${border}`}>
                {label && <div className={`text-xs mb-0.5 ${line.type === 'stderr' ? 'text-red-300' : 'text-gray-400'}`}>{label}</div>}
                <div className={`whitespace-pre-wrap ${textColor}`}>
                  {line.text}
                </div>
              </div>
            );
          })
        )}
        {running && (
          <div className="p-3 text-teal-400 animate-pulse">*bleep* Executing…</div>
        )}
      </div>

      {/* Expected output hint */}
      {expectedOutput && !solved && (
        <div className={`px-3 py-2 border-t text-xs ${
          isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-300 text-gray-500'
        }`}>
          <strong>Expected output:</strong>
          <pre className={`mt-1 text-sm p-2 rounded overflow-x-auto whitespace-pre-wrap break-all font-mono max-w-full ${
            isDark ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'
          }`}>{expectedOutput}</pre>
        </div>
      )}
      <GateComponent />
    </div>
  );
});

export default PythonTerminal;
