"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { getStoredSessionId } from "@/lib/appwrite/session";
import { useCurrentUserQuery } from "@/lib/appwrite/query-hooks";

function subscribeToSession(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSessionSnapshot() {
  return Boolean(getStoredSessionId());
}

function getServerSessionSnapshot() {
  return false;
}

export function HomeAuthCta() {
  const currentUserQuery = useCurrentUserQuery();
  const hasStoredSession = useSyncExternalStore(subscribeToSession, getSessionSnapshot, getServerSessionSnapshot);

  const isAuthed = currentUserQuery.isFetched ? Boolean(currentUserQuery.data) : hasStoredSession;
  const href = isAuthed ? "/dashboard" : "/login";
  const label = isAuthed ? "Dashboard" : "Sign in";

  return (
    <Link href={href} className="button button-secondary">
      {label}
    </Link>
  );
}
