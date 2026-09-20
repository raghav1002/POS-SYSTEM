"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store, Menu, X } from "lucide-react";
import { RoleCtaButton } from "@/components/public/role-cta-button";

export function POSHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

        {/* Desktop Center Nav */}
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

        {/* Desktop Right Action Button */}
        <div className="hidden md:flex items-center gap-3">
          <RoleCtaButton
            className="bg-[#723C1A] hover:bg-[#8B4513] text-white font-bold text-xs rounded-xl shadow-md border-none"
            size="sm"
          />
        </div>

        {/* Mobile Menu Toggle Button */}
        <div className="flex md:hidden items-center gap-2">
          <RoleCtaButton
            className="bg-[#723C1A] hover:bg-[#8B4513] text-white font-bold text-xs rounded-xl shadow-md border-none"
            size="sm"
          />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#723C1A] hover:text-[#2C1810] focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6 text-[#E85002]" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#723C1A]/15 bg-[#FAF6EE] p-4 space-y-3">
          <nav className="flex flex-col space-y-2 text-sm font-medium text-[#5C4033]">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`p-2 rounded-lg ${pathname === "/" ? "bg-[#723C1A]/10 text-[#723C1A] font-bold" : "hover:bg-[#723C1A]/5"}`}
            >
              Home
            </Link>
            <Link
              href="/products"
              onClick={() => setMobileMenuOpen(false)}
              className={`p-2 rounded-lg ${pathname.startsWith("/products") ? "bg-[#723C1A]/10 text-[#723C1A] font-bold" : "hover:bg-[#723C1A]/5"}`}
            >
              Products
            </Link>
            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className={`p-2 rounded-lg ${pathname === "/about" ? "bg-[#723C1A]/10 text-[#723C1A] font-bold" : "hover:bg-[#723C1A]/5"}`}
            >
              About
            </Link>
            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className={`p-2 rounded-lg ${pathname === "/contact" ? "bg-[#723C1A]/10 text-[#723C1A] font-bold" : "hover:bg-[#723C1A]/5"}`}
            >
              Contact
            </Link>
          </nav>

          <div className="pt-2 border-t border-[#723C1A]/10">
            <RoleCtaButton
              className="bg-[#723C1A] hover:bg-[#8B4513] text-white font-bold text-xs rounded-xl shadow-md border-none"
              size="sm"
              fullWidth
            />
          </div>
        </div>
      )}
    </header>
  );
}
