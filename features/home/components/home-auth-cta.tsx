"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { useSessionStore } from "@/features/auth/stores/session-store";

export function HomeAuthCta() {
  const currentUserQuery = useCurrentUser();
  const sessionId = useSessionStore((state) => state.sessionId);
  const hasHydrated = useSessionStore((state) => state.hasHydrated);

  const isAuthed = currentUserQuery.isFetched
    ? Boolean(currentUserQuery.data)
    : hasHydrated && Boolean(sessionId);
  const href = isAuthed ? "/dashboard" : "/login";
  const label = isAuthed ? "Dashboard" : "Sign in";

  return (
    <Button variant="outline" asChild>
      <Link href={href}>{label}</Link>
    </Button>
  );
}
