import type { UserRole } from "@/types";

export interface RoleCtaConfig {
  label: string;
  href: string;
}

export interface SessionUserLike {
  role?: UserRole | string | null;
  status?: string | null;
}

/**
 * Single canonical source of truth for Role -> Workspace/Dashboard CTA mapping.
 */
export function getRoleCta(
  user?: SessionUserLike | null,
  status: "loading" | "authenticated" | "unauthenticated" = "unauthenticated"
): RoleCtaConfig & { isLoading: boolean; isUnprovisioned: boolean } {
  // 1. Session Loading State
  if (status === "loading") {
    return {
      label: "Loading...",
      href: "#",
      isLoading: true,
      isUnprovisioned: false,
    };
  }

  // 2. Unauthenticated, missing user, or inactive account
  if (status === "unauthenticated" || !user || user.status === "inactive") {
    return {
      label: "Staff Sign In",
      href: "/login",
      isLoading: false,
      isUnprovisioned: user?.status === "inactive",
    };
  }

  // 3. Unprovisioned Account (User signed in to auth but has no valid role)
  if (!user.role) {
    return {
      label: "Staff Sign In",
      href: "/login",
      isLoading: false,
      isUnprovisioned: true,
    };
  }

  const role = (user.role || "").toLowerCase().trim();

  // 4. Role-based Workspace Routing
  switch (role) {
    case "admin":
      return {
        label: "Admin Dashboard",
        href: "/dashboard",
        isLoading: false,
        isUnprovisioned: false,
      };

    case "supervisor":
      return {
        label: "Supervisor Workspace",
        href: "/workspace",
        isLoading: false,
        isUnprovisioned: false,
      };

    case "cashier":
      return {
        label: "POS Workspace",
        href: "/workspace",
        isLoading: false,
        isUnprovisioned: false,
      };

    case "employee":
    case "staff":
    case "manager":
    default:
      return {
        label: "Employee Workspace",
        href: "/workspace",
        isLoading: false,
        isUnprovisioned: false,
      };
  }
}
