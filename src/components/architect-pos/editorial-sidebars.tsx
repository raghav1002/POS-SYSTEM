"use client";

import { Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export function EditorialSidebars() {
  return (
    <>
      {/* LEFT EDITORIAL CARD */}
      <div className="hidden xl:flex flex-col justify-between absolute left-8 top-1/2 -translate-y-1/2 w-64 p-6 rounded-3xl border border-[#723C1A]/20 bg-[#FAF6EE]/85 backdrop-blur-md shadow-xl text-[#2C1810] z-20 space-y-4">
        <div className="w-8 h-8 rounded-xl bg-[#723C1A]/10 border border-[#723C1A]/20 flex items-center justify-center text-[#723C1A]">
          <Sparkles className="h-4 w-4" />
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#723C1A]">Curated Quality</span>
          <h3 className="text-xl font-black tracking-tight leading-snug font-serif text-[#2C1810]">
            Good Products, Brighter Days
          </h3>
        </div>

        <p className="text-xs text-[#5C4033] leading-relaxed">
          Streamlined point of sale operations built for everyday retail excellence.
        </p>

        <Link
          href="/about"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#723C1A] hover:text-[#C1440E] transition-colors pt-2 border-t border-[#723C1A]/15"
        >
          <span>Learn Our Story</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* RIGHT EDITORIAL CARD */}
      <div className="hidden xl:flex flex-col justify-between absolute right-8 top-1/2 -translate-y-1/2 w-64 p-6 rounded-3xl border border-[#723C1A]/20 bg-[#FAF6EE]/85 backdrop-blur-md shadow-xl text-[#2C1810] z-20 space-y-4">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#E85002]">Console Workflow</span>
          <h3 className="text-xl font-black tracking-tight leading-snug font-serif text-[#2C1810]">
            Scan • Bill • Print • Repeat
          </h3>
        </div>

        <p className="text-xs text-[#5C4033] leading-relaxed">
          High-speed thermal receipt checkout and live barcode sync in seconds.
        </p>

        <div className="pt-2 border-t border-[#723C1A]/15 flex items-center justify-between text-xs font-mono font-bold text-[#723C1A]">
          <span>SHIFT 01</span>
          <span className="text-[10px] text-green-700 bg-green-100 dark:bg-green-950/60 dark:text-green-400 px-2 py-0.5 rounded-full">ACTIVE</span>
        </div>
      </div>
    </>
  );
}
