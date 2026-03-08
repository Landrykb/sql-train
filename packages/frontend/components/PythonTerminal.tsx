'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { getPyErrorHelp } from '@/lib/pyErrorHelper';
import { useTheme } from '@/lib/useTheme';
import { BleepxFace } from '@/components/BleepxIcons';

// ─── Types ──────────────────────────────────────────────────────────────────

interface OutputLine {
  type: 'stdout' | 'stderr' | 'result' | 'system' | 'error-help';
  text: string;
}

interface PythonTerminalProps {
  initialCode?: string;
  expectedOutput?: string;
  solutionCode?: string;
  hints?: string[];
  onSolved?: () => void;
  height?: string;
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

// ─── Pyodide loader ─────────────────────────────────────────────────────────

let pyodidePromise: Promise<any> | null = null;

function loadPyodide(): Promise<any> {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = new Promise(async (resolve, reject) => {
    try {
      if (!(window as any).loadPyodide) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js';
        script.async = true;
        await new Promise<void>((res, rej) => {
          script.onload = () => res();
          script.onerror = () => rej(new Error('Failed to load Pyodide'));
          document.head.appendChild(script);
        });
      }
      const pyodide = await (window as any).loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/',
      });
      await pyodide.loadPackage(['numpy', 'pandas', 'micropip']);
      // Pre-install sklearn so users don't hit ModuleNotFoundError
      const micropip = pyodide.pyimport('micropip');
      await micropip.install('scikit-learn');
      resolve(pyodide);
    } catch (err) {
      pyodidePromise = null;
      reject(err);
    }
  });
  return pyodidePromise;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function PythonTerminal({
  initialCode = '',
  expectedOutput,
  solutionCode,
  hints = [],
  onSolved,
  height = '250px',
}: PythonTerminalProps) {
  const [code, setCode] = useState(initialCode);
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
  const outputRef = useRef<HTMLDivElement>(null);
  const { dark: systemDark } = useTheme();

  const isDark = editorTheme === 'auto' ? systemDark : editorTheme === 'dark';

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
    setOutput([{ type: 'system', text: '*bleep* Loading Python environment (first time may take ~10s)...' }]);
    try {
      const py = await loadPyodide();
      setPyodideReady(true);
      setLoadingPyodide(false);
      return py;
    } catch (err: any) {
      setOutput([{ type: 'stderr', text: `Failed to load Python: ${err.message}` }]);
      setLoadingPyodide(false);
      return null;
    }
  }, [pyodideReady]);

  // Run code with timeout protection
  const runCode = useCallback(async () => {
    if (running) return;
    setErrorHelp(null);
    setRunning(true);

    try {
      const pyodide = await ensurePyodide();
      if (!pyodide) { setRunning(false); return; }

      setOutput((prev) => [...prev, { type: 'system', text: '>>> Running...' }]);

      // Wrap execution in a timeout (30s)
      const execPromise = new Promise<{ stdout: string; stderr: string; result: any }>((resolve, reject) => {
        try {
          pyodide.runPython(`
import sys
from io import StringIO
_stdout = StringIO()
_stderr = StringIO()
sys.stdout = _stdout
sys.stderr = _stderr
`);
          let result: any;
          try {
            result = pyodide.runPython(code);
          } catch (pyErr: any) {
            const stderrContent = pyodide.runPython('_stderr.getvalue()');
            pyodide.runPython('sys.stdout = sys.__stdout__; sys.stderr = sys.__stderr__');
            const rawError = pyErr.message || String(pyErr);
            reject(new Error(stderrContent ? `${stderrContent}\n${rawError}` : rawError));
            return;
          }
          const stdout = pyodide.runPython('_stdout.getvalue()');
          const stderr = pyodide.runPython('_stderr.getvalue()');
          pyodide.runPython('sys.stdout = sys.__stdout__; sys.stderr = sys.__stderr__');
          resolve({ stdout, stderr, result });
        } catch (err) {
          reject(err);
        }
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Execution timed out after 30 seconds. Check for infinite loops.')), 30000)
      );

      const { stdout: stdoutContent, stderr: stderrContent, result } = await Promise.race([execPromise, timeoutPromise]);

      const newOutput: OutputLine[] = [];
      if (stdoutContent) newOutput.push({ type: 'stdout', text: stdoutContent });
      if (stderrContent) newOutput.push({ type: 'stderr', text: stderrContent });
      if (result !== undefined && result !== null && String(result) !== 'None') {
        newOutput.push({ type: 'result', text: String(result) });
      }
      if (newOutput.length === 0) {
        newOutput.push({ type: 'system', text: '(no output)' });
      }
      setOutput((prev) => [...prev, ...newOutput]);

      // Check if solved
      if (expectedOutput) {
        const actualOutput = (stdoutContent || '').trim();
        const expected = expectedOutput.trim();
        const isMatch = expected.split('\n').every((line: string) =>
          actualOutput.includes(line.trim()) || actualOutput.replace(/\s+/g, ' ').includes(line.trim().replace(/\s+/g, ' '))
        );
        if (isMatch && !solved) {
          setSolved(true);
          setOutput((prev) => [...prev, { type: 'system', text: '*bleep* Correct! Output matches. Points earned, human.' }]);
          onSolved?.();
        }
      }
    } catch (err: any) {
      const rawError = err.message || String(err);
      setOutput((prev) => [...prev, { type: 'stderr', text: rawError }]);
      setErrorHelp(getPyErrorHelp(rawError, code));
    } finally {
      setRunning(false);
    }
  }, [code, running, ensurePyodide, expectedOutput, solved, onSolved]);

  const clearOutput = () => { setOutput([]); setErrorHelp(null); };

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
      {/* Toolbar */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'
      }`}>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
          <span className={`text-xs font-bold ml-1 ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>
            🐍 Python
          </span>
          {solved && (
            <span className="text-[10px] font-bold text-green-500 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30">
              Solved
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Theme toggle */}
          <button
            onClick={cycleTheme}
            className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${
              isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
            title={`Theme: ${editorTheme}`}
          >
            {editorTheme === 'auto' ? '🔄 Auto' : editorTheme === 'dark' ? '🌙 Dark' : '☀️ Light'}
          </button>
          {hints.length > 0 && (
            <button
              onClick={showNextHint}
              disabled={hintIdx >= hints.length - 1}
              className={`px-2 py-1 text-[10px] font-bold rounded transition-colors disabled:opacity-40 ${
                isDark ? 'bg-amber-900/40 text-amber-300 hover:bg-amber-900/60' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              }`}
            >
              💡 Hint ({Math.max(0, hintIdx + 1)}/{hints.length})
            </button>
          )}
          {solutionCode && (
            <button
              onClick={() => setShowSolution(!showSolution)}
              className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${
                isDark ? 'bg-purple-900/40 text-purple-300 hover:bg-purple-900/60' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              }`}
            >
              {showSolution ? '🙈 Hide' : '👁️ Solution'}
            </button>
          )}
          <button
            onClick={clearOutput}
            className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${
              isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            Clear
          </button>
          <button
            onClick={runCode}
            disabled={running || !code.trim()}
            className="px-3 py-1 text-xs font-bold rounded bg-teal-600 text-white hover:bg-teal-700 transition-colors disabled:opacity-40 flex items-center gap-1"
          >
            {running ? '⏳ Running...' : '▶ Run'}
            <span className="text-[9px] opacity-70">(⌘↵)</span>
          </button>
        </div>
      </div>

      {/* Hint display */}
      {hintIdx >= 0 && (
        <div className={`px-3 py-2 border-b text-xs flex items-start gap-2 ${
          isDark ? 'bg-amber-900/20 border-amber-800 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <span className="flex-shrink-0">💡</span>
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
              className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${
                isDark ? 'bg-purple-800 text-purple-200 hover:bg-purple-700' : 'bg-purple-200 text-purple-700 hover:bg-purple-300'
              }`}
            >
              Copy to Editor
            </button>
          </div>
          <pre className="text-xs bg-gray-900 text-gray-100 rounded p-2 overflow-x-auto font-mono"><code>{solutionCode}</code></pre>
        </div>
      )}

      {/* Code editor — CodeMirror with Python syntax highlighting */}
      <CodeMirror
        value={code}
        onChange={(val: string) => setCode(val)}
        isDark={isDark}
        height={height}
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
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Output terminal */}
      <div
        ref={outputRef}
        className={`border-t p-3 font-mono text-xs overflow-auto max-h-64 min-h-[80px] ${
          isDark ? 'bg-gray-950 border-gray-700' : 'bg-gray-900 border-gray-300'
        }`}
      >
        {output.length === 0 ? (
          <div className="text-gray-500 italic">*bleep* Output will appear here after running your code...</div>
        ) : (
          output.map((line, i) => (
            <div
              key={i}
              className={`whitespace-pre-wrap mb-1 ${
                line.type === 'stderr' ? 'text-red-400' :
                line.type === 'system' ? 'text-teal-400 italic' :
                line.type === 'result' ? 'text-yellow-300' :
                'text-gray-200'
              }`}
            >
              {line.text}
            </div>
          ))
        )}
        {running && (
          <div className="text-teal-400 animate-pulse">*bleep* Executing...</div>
        )}
      </div>

      {/* Expected output hint */}
      {expectedOutput && !solved && (
        <div className={`px-3 py-2 border-t text-xs ${
          isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-300 text-gray-500'
        }`}>
          <strong>Expected output:</strong>
          <pre className={`mt-1 text-[11px] p-2 rounded overflow-x-auto font-mono ${
            isDark ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'
          }`}>{expectedOutput}</pre>
        </div>
      )}
    </div>
  );
}
