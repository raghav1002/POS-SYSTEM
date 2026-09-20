"use client";

import { Scan, FileText, Printer, ChevronRight } from "lucide-react";

export function WorkflowIndicator() {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-3 relative z-20">
      <div className="rounded-2xl border border-[#723C1A]/20 bg-[#FAF6EE]/90 backdrop-blur-md p-3 shadow-lg flex items-center justify-around text-xs font-bold text-[#2C1810]">
        {/* Step 1 */}
        <div className="flex items-center gap-2 text-[#723C1A]">
          <div className="w-7 h-7 rounded-lg bg-[#723C1A] text-white flex items-center justify-center text-xs font-black shadow-md">
            1
          </div>
          <Scan className="h-4 w-4 text-[#E85002]" />
          <span>SCAN</span>
        </div>

        <ChevronRight className="h-4 w-4 text-[#723C1A]/40" />

        {/* Step 2 */}
        <div className="flex items-center gap-2 text-[#5C4033]">
          <div className="w-7 h-7 rounded-lg bg-[#723C1A]/15 text-[#723C1A] flex items-center justify-center text-xs font-black">
            2
          </div>
          <FileText className="h-4 w-4 text-[#723C1A]" />
          <span>CREATE BILL</span>
        </div>

        <ChevronRight className="h-4 w-4 text-[#723C1A]/40" />

        {/* Step 3 */}
        <div className="flex items-center gap-2 text-[#5C4033]">
          <div className="w-7 h-7 rounded-lg bg-[#723C1A]/15 text-[#723C1A] flex items-center justify-center text-xs font-black">
            3
          </div>
          <Printer className="h-4 w-4 text-[#723C1A]" />
          <span>PRINT</span>
        </div>
      </div>
    </div>
  );
}
