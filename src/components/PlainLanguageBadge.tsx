"use client";

import { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { CIVIC_DICTIONARY } from "@/lib/civicDictionary";

interface Props {
  termKey: string;
  customLabel?: string;
  variant?: "badge" | "icon" | "inline";
}

export default function PlainLanguageBadge({
  termKey,
  customLabel,
  variant = "badge",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const term = CIVIC_DICTIONARY[termKey];

  if (!term) return null;

  return (
    <div className="relative inline-flex items-center">
      {variant === "badge" && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#f0ede6] text-slate-800 hover:bg-[#e7e2d9] transition-colors"
          title={`Ver significado cidadão de ${term.technical}`}
        >
          <HelpCircle className="w-3 h-3 text-slate-500" />
          <span>{customLabel || term.citizen}</span>
        </button>
      )}

      {variant === "icon" && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 rounded text-slate-400 hover:text-civic-ink hover:bg-[#ede7dd] transition-colors"
          title="Ver tradução em linguagem simples"
          aria-label="Ver tradução em linguagem simples"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      )}

      {variant === "inline" && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1 text-xs text-slate-700 underline decoration-dotted underline-offset-2 hover:text-civic-ink"
        >
          <span>{customLabel || term.citizen}</span>
          <HelpCircle className="w-3 h-3 text-slate-400" />
        </button>
      )}

      {/* Popover Card */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 bottom-full mb-2 w-80 sm:w-96 z-50 p-4 bg-white rounded-lg shadow-xl border border-[#d8d2c6] text-left">
            <div className="flex items-start justify-between gap-2 pb-2 mb-2 border-b border-[#f0ede6]">
              <div>
                <span className="text-[11px] font-sans font-semibold text-slate-500">
                  Linguagem Cidadã
                </span>
                <h4 className="text-sm font-serif font-bold text-civic-ink mt-0.5">
                  {term.citizen}
                </h4>
                <p className="text-xs text-slate-500 font-mono">
                  Termo oficial: {term.technical}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              {term.fullExplanation}
            </p>

            {term.practicalExample && (
              <div className="p-2.5 rounded bg-[#f6f3ee] border border-[#e7e2d9] text-xs text-slate-700">
                <span className="font-semibold block mb-0.5 text-civic-ink">Analogia prática:</span>
                {term.practicalExample}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
