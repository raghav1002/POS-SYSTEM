"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User, Loader2 } from "lucide-react";
import { Button, ButtonProps } from "@/components/ui/button";
import { useSession } from "@/components/providers/session-provider";
import { getRoleCta } from "@/lib/role-cta";

interface RoleCtaButtonProps {
  className?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  fullWidth?: boolean;
}

export function RoleCtaButton({
  className,
  variant = "brandGradient",
  size = "sm",
  fullWidth = false,
}: RoleCtaButtonProps) {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  // Prevent SSR hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Neutral loading state before client hydration or while session API request is pending
  if (!mounted || status === "loading") {
    return (
      <Button
        disabled
        size={size}
        variant={variant}
        className={`${fullWidth ? "w-full" : ""} opacity-75 cursor-not-allowed ${className || ""}`}
      >
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        <span>Loading...</span>
      </Button>
    );
  }

  const cta = getRoleCta(session?.user, status);

  return (
    <Button
      asChild
      size={size}
      variant={variant}
      className={`${fullWidth ? "w-full" : ""} ${className || ""}`}
    >
      <Link href={cta.href}>
        <User className="mr-1.5 h-4 w-4" />
        <span>{cta.label}</span>
      </Link>
    </Button>
  );
}
