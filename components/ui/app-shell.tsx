"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/layout/brand";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { getStoredSessionId } from "@/lib/appwrite/session";

const nav = [
  ["Dashboard", "/dashboard"],
  ["Integrations", "/integrations"],
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const currentUserQuery = useCurrentUser();
  const logoutMutation = useLogout();
  const signedIn = mounted
    ? (currentUserQuery.isFetched ? Boolean(currentUserQuery.data) : Boolean(getStoredSessionId()))
    : false;

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
