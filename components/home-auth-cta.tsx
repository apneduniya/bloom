"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { getStoredSessionId } from "@/lib/appwrite/session";
import { useCurrentUserQuery } from "@/lib/appwrite/query-hooks";

export function HomeAuthCta() {
  const currentUserQuery = useCurrentUserQuery();
  const [initialHref, setInitialHref] = useState("/login");
  const [initialLabel, setInitialLabel] = useState("Sign in");

  useEffect(() => {
    if (getStoredSessionId()) {
      setInitialHref("/dashboard");
      setInitialLabel("Dashboard");
    }
  }, []);

  const href = currentUserQuery.isFetched ? (currentUserQuery.data ? "/dashboard" : "/login") : initialHref;
  const label = currentUserQuery.isFetched ? (currentUserQuery.data ? "Dashboard" : "Sign in") : initialLabel;

  return (
    <Link href={href} className="button button-secondary">
      {label}
    </Link>
  );
}
