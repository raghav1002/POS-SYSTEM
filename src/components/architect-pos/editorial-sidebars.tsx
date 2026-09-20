"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function EditorialSidebars() {
  return (
    <>
      {/* LEFT EDITORIAL CARD ONLY */}
      <div className="hidden xl:flex flex-col justify-between absolute left-3 xl:left-4 2xl:left-8 top-1/2 -translate-y-1/2 w-52 2xl:w-60 p-3.5 2xl:p-5 rounded-3xl border border-[#723C1A]/20 bg-[#FAF6EE]/85 backdrop-blur-md shadow-xl text-[#2C1810] z-20 space-y-2.5">

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
    </>
  );
}
