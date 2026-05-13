"use client";

import Link from "next/link";
import { getStoredSessionId } from "@/lib/appwrite/session";
import { useCurrentUserQuery } from "@/lib/appwrite/query-hooks";

export function HomeAuthCta() {
  const currentUserQuery = useCurrentUserQuery();
  const hasStoredSession = Boolean(getStoredSessionId());
  const href = currentUserQuery.isFetched ? (currentUserQuery.data ? "/dashboard" : "/login") : hasStoredSession ? "/dashboard" : "/login";
  const label = currentUserQuery.isFetched ? (currentUserQuery.data ? "Dashboard" : "Sign in") : hasStoredSession ? "Dashboard" : "Sign in";

  return (
    <Link href={href} className="button button-secondary">
      {label}
    </Link>
  );
}
