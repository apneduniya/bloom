"use client";

import { useEffect, useRef } from "react";
import { hasAppwriteClientConfig } from "@/lib/appwrite/config";
import { client } from "@/lib/appwrite/client";

export function AppwritePing() {
  const hasPinged = useRef(false);

  useEffect(() => {
    if (hasPinged.current || !hasAppwriteClientConfig()) {
      return;
    }

    hasPinged.current = true;

    client
      .ping()
      .then((response) => {
        console.info("[Appwrite] Ping succeeded:", response);
      })
      .catch((error: unknown) => {
        console.error("[Appwrite] Ping failed:", error);
      });
  }, []);

  return null;
}
