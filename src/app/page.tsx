import { ParallaxScene } from "@/components/architect-pos/parallax-scene";
import { POSHeader } from "@/components/architect-pos/pos-header";
import { ScannerModule } from "@/components/architect-pos/scanner-module";
import { EditorialSidebars } from "@/components/architect-pos/editorial-sidebars";
import { WorkflowIndicator } from "@/components/architect-pos/workflow-indicator";
import Link from "next/link";
import { Store, Clock } from "lucide-react";

export const revalidate = 60;

export default async function StorefrontHomePage() {
  return (
    <ParallaxScene>
      {/* 1. STICKY HEADER */}
      <div className="shrink-0 relative z-50">
        <POSHeader />
      </div>

      {/* 2. MAIN HERO SCANNER SECTION */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-6 relative z-20">
        {/* Left & Right Editorial Cards (xl breakpoint) */}
        <EditorialSidebars />

        {/* Central Scanner Hero Module */}
        <ScannerModule />

        {/* 3-Step Workflow Bar */}
        <div className="mt-8 w-full">
          <WorkflowIndicator />
        </div>
      </main>

      {/* 3. FOOTER */}
      <footer className="shrink-0 border-t border-[#723C1A]/15 bg-[#FAF6EE]/90 backdrop-blur-md py-3 px-4 lg:px-8 relative z-50">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#5C4033]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-bold text-[#2C1810]">
              <Store className="h-3.5 w-3.5 text-[#723C1A]" /> RetailPOS
            </span>
            <span className="hidden sm:inline text-[#723C1A]/30">|</span>
            <span className="hidden sm:inline flex items-center gap-1 text-[#5C4033]">
              <Clock className="h-3 w-3 text-[#E85002]" /> Open Daily: 9:00 AM – 9:00 PM
            </span>
          </div>

          <div className="flex items-center gap-6 text-[11px] font-semibold">
            <Link href="/products" className="hover:text-[#723C1A] transition-colors">Products Catalog</Link>
            <Link href="/about" className="hover:text-[#723C1A] transition-colors">About Us</Link>
            <Link href="/contact" className="hover:text-[#723C1A] transition-colors">Contact & Location</Link>
            <Link href="/login" className="font-bold text-[#723C1A] hover:underline">
              Staff Login →
            </Link>
          </div>
        </div>
      </footer>
    </ParallaxScene>
  );
}
