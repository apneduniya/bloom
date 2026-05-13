"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { requestMagicLink, startGoogleOAuth } from "@/lib/appwrite/auth";
import { useCurrentUserQuery, useLogoutMutation } from "@/lib/appwrite/query-hooks";

export function AuthPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUserQuery = useCurrentUserQuery();
  const logoutMutation = useLogoutMutation();
  const user = currentUserQuery.data;
  const [email, setEmail] = useState(user?.email ?? "");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const next = searchParams.get("next") ?? "/dashboard";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setStatus("");
    try {
      await requestMagicLink(email.trim(), next);
      setStatus("Check your email for the Bloom sign-in link.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send sign-in link.");
    }
  }

  async function handleLogout() {
    await logoutMutation.mutateAsync();
    router.push("/");
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div>
          <p className="eyebrow">Secure workspace</p>
          <h1>Sign in to Bloom</h1>
          <p className="muted">
            Use a magic link or Google OAuth to access your private Bloom workspace.
          </p>
        </div>
        <form onSubmit={submit} className="stack">
          <Field label="Email">
            <Input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          {error ? <p className="form-error">{error}</p> : null}
          {status ? <p className="success-note">{status}</p> : null}
          <Button type="submit">Email magic link</Button>
          <Button type="button" variant="secondary" onClick={() => startGoogleOAuth(next)}>
            Continue with Google
          </Button>
          {currentUserQuery.isFetched && user ? (
            <Button type="button" variant="ghost" onClick={handleLogout}>
              Log out {user.email}
            </Button>
          ) : null}
        </form>
      </section>
    </main>
  );
}
