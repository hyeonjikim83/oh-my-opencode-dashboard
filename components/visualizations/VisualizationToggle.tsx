"use client";

import { useCallback, useEffect, useState } from "react";

interface VisualizationToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

const STORAGE_KEY = "viz-mode";

export function useVizMode(): [boolean, (v: boolean) => void] {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    try {
      setEnabled(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {}
  }, []);

  const toggle = useCallback((v: boolean) => {
    setEnabled(v);
    try {
      localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch {}
  }, []);

  return [enabled, toggle];
}

export function VisualizationToggle({ enabled, onToggle }: VisualizationToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onToggle(!enabled)}
      className="group flex items-center gap-2.5 rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs transition-colors hover:border-slate-600"
    >
      <span className="text-slate-400 transition-colors group-hover:text-slate-300">
        Visualizations
      </span>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${
          enabled ? "bg-violet-500" : "bg-slate-700"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200 ${
            enabled ? "translate-x-4" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}
