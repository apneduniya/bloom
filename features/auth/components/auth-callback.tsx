"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { authQueryKeys } from "@/features/auth/constants/query-keys";
import { authSessionService } from "@/features/auth/services/auth-session-service";

export function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  useEffect(() => {
    const next = searchParams.get("next") ?? "/dashboard";
    const userId = searchParams.get("userId");
    const secret = searchParams.get("secret");

    async function finish() {
      try {
        if (userId && secret) {
          await authSessionService.completeSession(userId, secret);
        } else {
          const user = await authSessionService.getCurrentUser();
          if (!user) throw new Error("The sign-in callback did not include a session token.");
        }
        await queryClient.invalidateQueries({ queryKey: authQueryKeys.currentUser() });
        router.replace(next);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not complete sign in.");
      }
    }

    void finish();
  }, [queryClient, router, searchParams]);

  return (
    <main className="page-pad">
      {error ? (
        <>
          <h1>Sign in failed</h1>
          <p className="form-error">{error}</p>
        </>
      ) : (
        <p>Completing sign in...</p>
      )}
    </main>
  );
}
