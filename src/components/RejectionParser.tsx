"use client";

import { useState } from "react";

export function RejectionParser() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setResult(data.result);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="glass-card-static p-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-3 h-3 rounded-full bg-[#ff2d78]/30 border border-[#ff2d78]/40" />
          <div className="w-3 h-3 rounded-full bg-white/10 border border-white/10" />
          <div className="w-3 h-3 rounded-full bg-white/10 border border-white/10" />
          <span className="ml-3 text-[11px] text-white/20 font-mono tracking-wider">ANALYZER</span>
        </div>

        <textarea
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Paste your App Store review feedback here..."
          rows={5}
          className="w-full bg-transparent text-[15px] leading-7 text-white placeholder-white/20 resize-none outline-none"
          style={{
            fontFamily: "var(--font-inter)",
            caretColor: "#ff2d78",
          }}
        />

        <div
          className="flex items-center justify-between mt-6 pt-5"
          style={{ borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}
        >
          <span className="text-[12px] text-white/15">
            Free &middot; No signup required
          </span>
          <button
            onClick={handleSubmit}
            disabled={loading || !email.trim()}
            className="btn-primary disabled:opacity-20 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {loading ? (
              <span className="flex items-center gap-2.5">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing...
              </span>
            ) : (
              "Get Fix Plan"
            )}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="mt-6 glass-card-static p-5 text-[14px] leading-6 text-red-300 animate-fade-up"
          style={{
            background: "rgba(255, 60, 60, 0.06)",
            borderColor: "rgba(255, 60, 60, 0.15)",
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <div
          className="mt-8 glass-card-static p-8 text-[14px] leading-7 text-white/70 whitespace-pre-line animate-fade-up"
          style={{
            fontFamily: "var(--font-inter)",
            background: "rgba(255, 45, 120, 0.04)",
            borderColor: "rgba(255, 45, 120, 0.12)",
          }}
        >
          {result}
        </div>
      )}
    </div>
  );
}
