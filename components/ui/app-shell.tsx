"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/layout/brand";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { useSessionStore } from "@/features/auth/stores/session-store";

const nav = [
  // ["Dashboard", "/dashboard"],
  ["Integrations", "/integrations"],
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const currentUserQuery = useCurrentUser();
  const logoutMutation = useLogout();
  const sessionId = useSessionStore((state) => state.sessionId);
  const hasHydrated = useSessionStore((state) => state.hasHydrated);
  const signedIn = currentUserQuery.isFetched
    ? Boolean(currentUserQuery.data)
    : hasHydrated && Boolean(sessionId);

  useEffect(() => {
    if (currentUserQuery.isFetched && !currentUserQuery.data) {
      router.replace("/login");
    }
  }, [currentUserQuery.isFetched, currentUserQuery.data, router]);

  async function handleLogout() {
    await logoutMutation.mutateAsync();
    window.location.href = "/";
  }

  return (
    <div className="app-shell">
      <header className="top-nav">
        <Brand href="/?home=true" />
        <nav>
          {signedIn
            ? nav.map(([label, href]) => (
                <Link key={href} href={href}>
                  {label}
                </Link>
              ))
            : null}
          {signedIn ? <button className="nav-button" onClick={handleLogout}>Logout</button> : <Link href="/login">Login</Link>}
        </nav>
      </header>
      {children}
    </div>
  );
}
