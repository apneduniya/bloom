"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { getStoredSessionId } from "@/lib/appwrite/session";
import { useCurrentUserQuery, useLogoutMutation } from "@/lib/appwrite/query-hooks";

const nav = [
  ["Dashboard", "/dashboard"],
  ["Integrations", "/integrations"],
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const currentUserQuery = useCurrentUserQuery();
  const logoutMutation = useLogoutMutation();
  const signedIn = currentUserQuery.isFetched ? Boolean(currentUserQuery.data) : Boolean(getStoredSessionId());

  async function handleLogout() {
    await logoutMutation.mutateAsync();
    window.location.href = "/";
  }

  return (
    <div className="app-shell">
      <header className="top-nav">
        <Link href="/" className="brand">
          <span className="brand-mark">B</span>
          Bloom
        </Link>
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
