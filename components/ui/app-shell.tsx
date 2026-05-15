"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/layout/brand";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Button } from "@/components/ui/button";
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
        <nav className="flex items-center gap-3">
          {signedIn
            ? nav.map(([label, href]) => (
                <Link key={href} href={href} className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  {label}
                </Link>
              ))
            : null}
          {signedIn ? (
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Login</Link>
            </Button>
          )}
          <ThemeToggle />
        </nav>
      </header>
      {children}
    </div>
  );
}
