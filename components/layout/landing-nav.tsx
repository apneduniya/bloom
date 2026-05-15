"use client";

import Link from "next/link";
import { Brand } from "./brand";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { useSessionStore } from "@/features/auth/stores/session-store";

export function LandingNav() {
  const currentUserQuery = useCurrentUser();
  const sessionId = useSessionStore((state) => state.sessionId);
  const hasHydrated = useSessionStore((state) => state.hasHydrated);
  const signedIn = currentUserQuery.isFetched
    ? Boolean(currentUserQuery.data)
    : hasHydrated && Boolean(sessionId);

  return (
    <nav className="landing-nav">
      <Brand />
      {!signedIn && (
        <div>
          <Link href="/login">Login</Link>
        </div>
      )}
    </nav>
  );
}
