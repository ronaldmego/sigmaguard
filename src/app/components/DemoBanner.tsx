"use client";

import { useState, useEffect, useCallback } from "react";

interface DemoBannerProps {
  onVisibilityChange?: (visible: boolean) => void;
}

export default function DemoBanner({ onVisibilityChange }: DemoBannerProps) {
  const [isDemo, setIsDemo] = useState(false);
  const [running, setRunning] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const demo = params.get("demo") === "true";
    setIsDemo(demo);
    onVisibilityChange?.(demo);
  }, [onVisibilityChange]);

  const handleToggleMode = useCallback(() => {
    const url = new URL(window.location.href);
    if (isDemo) {
      url.searchParams.delete("demo");
    } else {
      url.searchParams.set("demo", "true");
    }
    window.location.href = url.toString();
  }, [isDemo]);

  const handleRunDemo = useCallback(async () => {
    setLoadingDemo(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/demo/start", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.started) {
        setRunning(true);
        setTimeout(() => setRunning(false), 5.5 * 60 * 1000);
      } else if (res.status === 409) {
        setRunning(true);
      } else {
        setError(data.error || "Failed to start");
      }
    } catch {
      setError("Connection error");
    } finally {
      setLoadingDemo(false);
    }
  }, []);

  const handleReset = useCallback(async () => {
    setResetting(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/demo/reset", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.reset) {
        setRunning(false);
        window.location.reload();
      } else {
        setError(data.error || "Reset failed");
      }
    } catch {
      setError("Connection error");
    } finally {
      setResetting(false);
    }
  }, []);

  // Always render the toggle — even outside demo mode
  // In prod mode: just the small toggle in the header area
  // In demo mode: full banner with controls

  if (!isDemo) {
    // Minimal toggle visible in "production" mode
    return (
      <div className="fixed top-3 right-4 z-50">
        <button
          onClick={handleToggleMode}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#12121e] border border-gray-800/50 hover:border-gray-700 transition-colors group"
        >
          <span className="text-[10px] text-gray-500 group-hover:text-gray-400 uppercase tracking-wider">
            Production
          </span>
          <div className="w-8 h-4 rounded-full bg-gray-700 relative transition-colors">
            <div className="absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-gray-400 transition-transform" />
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-10 bg-[#1a0f00] border-b border-orange-800/40 flex items-center justify-between px-4">
      {/* Left: status */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          <span className="text-xs font-semibold text-orange-400 tracking-wide uppercase">
            Demo Mode
          </span>
        </div>
        <span className="text-gray-600 hidden sm:inline">|</span>
        <span className="text-xs text-gray-500 hidden sm:inline">
          Simulated data &middot; No real funds
        </span>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {error && (
          <span className="text-xs text-red-400 hidden sm:inline">{error}</span>
        )}

        {/* Reset DB button */}
        <button
          onClick={handleReset}
          disabled={resetting}
          className="px-2.5 py-1 rounded-md text-xs font-medium text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
        >
          {resetting ? "Resetting..." : "Reset DB"}
        </button>

        {/* Run Demo button */}
        <button
          onClick={handleRunDemo}
          disabled={loadingDemo || running}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
            running
              ? "bg-orange-500/10 text-orange-400 border border-orange-500/30 cursor-default"
              : "bg-orange-600 text-white hover:bg-orange-500 active:bg-orange-700"
          } disabled:opacity-60`}
        >
          {loadingDemo ? (
            "Starting..."
          ) : running ? (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              Demo Running
            </span>
          ) : (
            "Run Demo"
          )}
        </button>

        {/* Toggle to production */}
        <button
          onClick={handleToggleMode}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-gray-500 hover:text-gray-300 transition-colors"
          title="Switch to Production mode"
        >
          <div className="w-8 h-4 rounded-full bg-orange-600/40 relative">
            <div className="absolute right-0.5 top-0.5 w-3 h-3 rounded-full bg-orange-400 transition-transform" />
          </div>
          <span className="hidden sm:inline">Demo</span>
        </button>
      </div>
    </div>
  );
}
