"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { RoleCtaButton } from "@/components/public/role-cta-button";

export function PublicHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md px-4 lg:px-8">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex flex-col">
            <span className="text-base font-extrabold leading-none tracking-wide text-white">RetailPOS</span>
            <span className="text-[10px] font-semibold text-[#E85002] tracking-wider uppercase">Storefront 2026</span>
          </div>
        </Link>

        {/* Desktop Center Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-zinc-300">
          <Link
            href="/"
            className={`transition-colors hover:text-[#E85002] ${pathname === "/" ? "text-[#E85002] font-bold" : ""}`}
          >
            Home
          </Link>
          <Link
            href="/products"
            className={`transition-colors hover:text-[#E85002] ${pathname.startsWith("/products") ? "text-[#E85002] font-bold" : ""}`}
          >
            Products
          </Link>
          <Link
            href="/about"
            className={`transition-colors hover:text-[#E85002] ${pathname === "/about" ? "text-[#E85002] font-bold" : ""}`}
          >
            About
          </Link>
          <Link
            href="/contact"
            className={`transition-colors hover:text-[#E85002] ${pathname === "/contact" ? "text-[#E85002] font-bold" : ""}`}
          >
            Contact
          </Link>
        </nav>

        {/* Desktop Right Role-Aware CTA */}
        <div className="hidden md:flex items-center gap-3">
          <RoleCtaButton variant="brandGradient" size="sm" />
        </div>

        {/* Mobile Menu Toggle Button */}
        <div className="flex md:hidden items-center gap-2">
          <RoleCtaButton variant="brandGradient" size="sm" />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-zinc-400 hover:text-white focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6 text-[#E85002]" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-800 bg-zinc-950 p-4 space-y-3">
          <nav className="flex flex-col space-y-2 text-sm font-medium text-zinc-300">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`p-2 rounded-lg ${pathname === "/" ? "bg-[#E85002]/10 text-[#E85002] font-bold" : "hover:bg-zinc-900"}`}
            >
              Home
            </Link>
            <Link
              href="/products"
              onClick={() => setMobileMenuOpen(false)}
              className={`p-2 rounded-lg ${pathname.startsWith("/products") ? "bg-[#E85002]/10 text-[#E85002] font-bold" : "hover:bg-zinc-900"}`}
            >
              Products
            </Link>
            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className={`p-2 rounded-lg ${pathname === "/about" ? "bg-[#E85002]/10 text-[#E85002] font-bold" : "hover:bg-zinc-900"}`}
            >
              About
            </Link>
            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className={`p-2 rounded-lg ${pathname === "/contact" ? "bg-[#E85002]/10 text-[#E85002] font-bold" : "hover:bg-zinc-900"}`}
            >
              Contact
            </Link>
          </nav>

          <div className="pt-2 border-t border-zinc-900">
            <RoleCtaButton variant="brandGradient" size="sm" fullWidth />
          </div>
        </div>
      )}
    </header>
  );
}
