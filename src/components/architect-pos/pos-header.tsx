"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/providers/session-provider";

export function POSHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b border-[#723C1A]/15 bg-[#FAF6EE]/90 backdrop-blur-md px-4 lg:px-8">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#723C1A] to-[#4A230E] text-white shadow-md shadow-[#723C1A]/20 group-hover:scale-105 transition-transform">
            <Store className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-extrabold leading-none tracking-wide text-[#2C1810]">
              RetailPOS
            </span>
            <span className="text-[10px] font-bold text-[#E85002] tracking-wider uppercase">
              Storefront 2026
            </span>
          </div>
        </Link>

        {/* Center Nav */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-bold text-[#5C4033]">
          <Link
            href="/"
            className={`transition-colors hover:text-[#723C1A] ${pathname === "/" ? "text-[#723C1A] underline underline-offset-4" : ""}`}
          >
            Home
          </Link>
          <Link
            href="/products"
            className={`transition-colors hover:text-[#723C1A] ${pathname.startsWith("/products") ? "text-[#723C1A] underline underline-offset-4" : ""}`}
          >
            Products
          </Link>
          <Link
            href="/about"
            className={`transition-colors hover:text-[#723C1A] ${pathname === "/about" ? "text-[#723C1A] underline underline-offset-4" : ""}`}
          >
            About
          </Link>
          <Link
            href="/contact"
            className={`transition-colors hover:text-[#723C1A] ${pathname === "/contact" ? "text-[#723C1A] underline underline-offset-4" : ""}`}
          >
            Contact
          </Link>
        </nav>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          {session?.user ? (
            <Button asChild size="sm" className="bg-[#723C1A] hover:bg-[#8B4513] text-white font-bold text-xs rounded-xl shadow-md">
              <Link href={session.user.role === "cashier" ? "/pos" : "/dashboard"}>
                <User className="mr-1.5 h-4 w-4" />
                {session.user.role === "cashier" ? "Open POS Workspace" : "Admin Dashboard"}
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="bg-[#723C1A] hover:bg-[#8B4513] text-white font-bold text-xs rounded-xl shadow-md">
              <Link href="/login">
                <User className="mr-1.5 h-4 w-4" />
                Staff Sign In
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
