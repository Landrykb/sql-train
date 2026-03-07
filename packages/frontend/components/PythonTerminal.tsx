'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface OutputLine {
  type: 'stdout' | 'stderr' | 'result' | 'system';
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

// ─── Pyodide loader ─────────────────────────────────────────────────────────

let pyodidePromise: Promise<any> | null = null;

function loadPyodide(): Promise<any> {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = new Promise(async (resolve, reject) => {
    try {
      // Load Pyodide script
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
      // Pre-load common packages
      await pyodide.loadPackage(['numpy', 'pandas', 'micropip']);
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
  height = '300px',
}: PythonTerminalProps) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [running, setRunning] = useState(false);
  const [pyodideReady, setPyodideReady] = useState(false);
  const [loadingPyodide, setLoadingPyodide] = useState(false);
  const [hintIdx, setHintIdx] = useState(-1);
  const [showSolution, setShowSolution] = useState(false);
  const [solved, setSolved] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  // Initialize Pyodide on first interaction
  const initPyodide = useCallback(async () => {
    if (pyodideReady || loadingPyodide) return;
    setLoadingPyodide(true);
    setOutput([{ type: 'system', text: '⏳ Loading Python environment (first time may take ~10s)...' }]);
    try {
      await loadPyodide();
      setPyodideReady(true);
      setOutput([{ type: 'system', text: '✅ Python environment ready! numpy and pandas are pre-loaded.' }]);
    } catch (err: any) {
      setOutput([{ type: 'stderr', text: `❌ Failed to load Python: ${err.message}` }]);
    } finally {
      setLoadingPyodide(false);
    }
  }, [pyodideReady, loadingPyodide]);

  // Run code
  const runCode = useCallback(async () => {
    if (running) return;
    if (!pyodideReady) {
      await initPyodide();
      // Wait for Pyodide to be ready
      try {
        await loadPyodide();
        setPyodideReady(true);
      } catch {
        return;
      }
    }

    setRunning(true);
    setOutput((prev) => [...prev, { type: 'system', text: `>>> Running...` }]);

    try {
      const pyodide = await loadPyodide();

      // Capture stdout/stderr
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
        setOutput((prev) => [
          ...prev,
          ...(stderrContent ? [{ type: 'stderr' as const, text: stderrContent }] : []),
          { type: 'stderr' as const, text: pyErr.message || String(pyErr) },
        ]);
        setRunning(false);
        return;
      }

      // Get captured output
      const stdoutContent = pyodide.runPython('_stdout.getvalue()');
      const stderrContent = pyodide.runPython('_stderr.getvalue()');
      pyodide.runPython('sys.stdout = sys.__stdout__; sys.stderr = sys.__stderr__');

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
        // Flexible matching: check if key parts of expected output appear
        const isMatch = expected.split('\n').every((line: string) =>
          actualOutput.includes(line.trim()) || actualOutput.replace(/\s+/g, ' ').includes(line.trim().replace(/\s+/g, ' '))
        );
        if (isMatch && !solved) {
          setSolved(true);
          setOutput((prev) => [...prev, { type: 'system', text: '🎉 Correct! Your output matches the expected result.' }]);
          onSolved?.();
        }
      }
    } catch (err: any) {
      setOutput((prev) => [...prev, { type: 'stderr', text: `Error: ${err.message}` }]);
    } finally {
      setRunning(false);
    }
  }, [code, running, pyodideReady, initPyodide, expectedOutput, solved, onSolved]);

  const clearOutput = () => setOutput([]);

  const showNextHint = () => {
    if (hintIdx < hints.length - 1) {
      setHintIdx((i) => i + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      runCode();
    }
    // Tab indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newCode = code.substring(0, start) + '    ' + code.substring(end);
        setCode(newCode);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 4;
        }, 0);
      }
    }
  };

  return (
    <div className="rounded-xl border border-bleepx-border overflow-hidden bg-bleepx-white shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-bleepx-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-teal-600">🐍 Python</span>
          {solved && <span className="text-xs font-bold text-green-600 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30">✅ Solved</span>}
        </div>
        <div className="flex items-center gap-2">
          {hints.length > 0 && (
            <button onClick={showNextHint} disabled={hintIdx >= hints.length - 1} className="px-2 py-1 text-[10px] font-bold rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 transition-colors disabled:opacity-40">
              💡 Hint ({hintIdx + 1}/{hints.length})
            </button>
          )}
          {solutionCode && (
            <button onClick={() => setShowSolution(!showSolution)} className="px-2 py-1 text-[10px] font-bold rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 transition-colors">
              {showSolution ? '🙈 Hide' : '👁️ Solution'}
            </button>
          )}
          <button onClick={clearOutput} className="px-2 py-1 text-[10px] font-bold rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 transition-colors">
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
        <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
          <strong>Hint {hintIdx + 1}:</strong> {hints[hintIdx]}
        </div>
      )}

      {/* Solution display */}
      {showSolution && solutionCode && (
        <div className="px-3 py-2 bg-purple-50 dark:bg-purple-900/10 border-b border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-purple-700 dark:text-purple-300">Solution Code:</span>
            <button
              onClick={() => setCode(solutionCode)}
              className="text-[10px] px-2 py-0.5 rounded bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-300 transition-colors"
            >
              Copy to Editor
            </button>
          </div>
          <pre className="text-xs bg-gray-900 text-gray-100 rounded p-2 overflow-x-auto"><code>{solutionCode}</code></pre>
        </div>
      )}

      {/* Code editor */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className="w-full font-mono text-sm bg-gray-900 text-gray-100 p-4 outline-none resize-none leading-relaxed"
          style={{ height, minHeight: '120px' }}
          placeholder="# Write your Python code here...&#10;# Press ⌘+Enter (Ctrl+Enter) to run&#10;&#10;import pandas as pd&#10;import numpy as np"
        />
      </div>

      {/* Output terminal */}
      <div
        ref={outputRef}
        className="bg-gray-950 border-t border-gray-700 p-3 font-mono text-xs overflow-auto max-h-64 min-h-[80px]"
      >
        {output.length === 0 ? (
          <div className="text-gray-500 italic">Output will appear here after running your code...</div>
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
          <div className="text-teal-400 animate-pulse">⏳ Executing...</div>
        )}
      </div>

      {/* Expected output hint */}
      {expectedOutput && !solved && (
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-t border-bleepx-border text-xs text-bleepx-text-secondary">
          <strong>Expected output:</strong>
          <pre className="mt-1 text-[11px] bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto">{expectedOutput}</pre>
        </div>
      )}
    </div>
  );
}
