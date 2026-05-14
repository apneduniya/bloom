"use client";

import Link from "next/link";
import { Brand } from "./brand";
import { useCurrentUserQuery } from "@/lib/appwrite/query-hooks";
import { getStoredSessionId } from "@/lib/appwrite/session";

export function LandingNav() {
  const currentUserQuery = useCurrentUserQuery();
  const signedIn = currentUserQuery.isFetched
    ? Boolean(currentUserQuery.data)
    : Boolean(getStoredSessionId());

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
