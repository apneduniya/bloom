"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "@/lib/appwrite/auth";
import { listBlooms } from "@/lib/appwrite/blooms";
import { getIntegration } from "@/lib/appwrite/integrations";
import type { BloomSnapshot } from "@/lib/validation/types";
import { emptySnapshot } from "./store";

export function useBloomStore() {
  const [snapshot, setSnapshot] = useState<BloomSnapshot>(() => emptySnapshot());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setReady(false);
    setError("");
    const user = await getCurrentUser();
    if (!user) {
      setSnapshot(emptySnapshot());
      setReady(true);
      return emptySnapshot();
    }
    try {
      const [blooms, integration] = await Promise.all([listBlooms(user), getIntegration(user)]);
      const next = { user, blooms, integrations: integration ? [integration] : [], sendJobs: [] };
      setSnapshot(next);
      setReady(true);
      return next;
    } catch (cause) {
      const message = describeStoreError(cause);
      setSnapshot({ ...emptySnapshot(), user });
      setError(message);
      setReady(true);
      return emptySnapshot();
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      const user = await getCurrentUser();
      if (!active) return;
      if (!user) {
        setSnapshot(emptySnapshot());
        setReady(true);
        return;
      }
      try {
        const [blooms, integration] = await Promise.all([listBlooms(user), getIntegration(user)]);
        if (!active) return;
        setSnapshot({ user, blooms, integrations: integration ? [integration] : [], sendJobs: [] });
        setReady(true);
      } catch (cause) {
        if (!active) return;
        setSnapshot({ ...emptySnapshot(), user });
        setError(describeStoreError(cause));
        setReady(true);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const api = useMemo(
    () => ({
      snapshot,
      ready,
      error,
      refresh,
      setSnapshot,
      commit(updater: (snapshot: BloomSnapshot) => BloomSnapshot) {
        const next = updater(snapshot);
        setSnapshot(next);
      },
    }),
    [snapshot, ready, refresh, error],
  );

  return api;
}

function describeStoreError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : "Could not load Bloom data.";
  if (message.includes("Database with the requested ID")) {
    return "Appwrite database 'bloom' was not found. Create that database in Appwrite Console or update NEXT_PUBLIC_APPWRITE_DATABASE_ID to the database ID that already exists.";
  }
  return message;
}
