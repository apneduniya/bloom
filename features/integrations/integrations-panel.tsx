"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status-pill";
import { createId } from "@/lib/persistence/store";
import { useCurrentUserQuery, useIntegrationQuery, useSaveIntegrationMutation, useTestIntegrationMutation } from "@/lib/appwrite/query-hooks";
import { validateIntegration } from "@/lib/validation/schemas";
import type { Integration, User } from "@/lib/validation/types";

export function IntegrationsPanel() {
  const currentUserQuery = useCurrentUserQuery();
  const user = currentUserQuery.data;
  const integrationQuery = useIntegrationQuery(user);
  if (!currentUserQuery.isFetched || (user && integrationQuery.isPending)) return <main className="page-pad">Loading integration...</main>;
  if (integrationQuery.error) return <main className="page-pad"><p className="form-error">{integrationQuery.error instanceof Error ? integrationQuery.error.message : "Could not load SMTP integration."}</p></main>;
  if (!user) return <main className="page-pad">Redirecting to sign in...</main>;

  return <IntegrationsForm key={user.id} user={user} initialIntegration={integrationQuery.data ?? null} />;
}

function IntegrationsForm({ user, initialIntegration }: { user: User; initialIntegration: Integration | null }) {
  const saveIntegrationMutation = useSaveIntegrationMutation(user);
  const testIntegrationMutation = useTestIntegrationMutation(user);
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState<Integration>(() => initialIntegration ?? emptyIntegration(user.id));

  async function submit(event: FormEvent, test = false) {
    event.preventDefault();
    const validation = validateIntegration(form, secret);
    if (!validation.ok) {
      setError(validation.errors.join(" "));
      return;
    }

    const next: Integration = {
      ...form,
      ownerId: user.id,
      status: test ? "draft" : form.status,
      errorMessage: undefined,
    };
    try {
      const saved = test
        ? await testIntegrationMutation.mutateAsync({ integration: next, secret })
        : await saveIntegrationMutation.mutateAsync(next);
      setForm(saved);
      setSecret("");
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save SMTP settings.");
    }
  }

  return (
    <main className="settings-page">
      <section className="settings-heading">
        <div>
          <p className="eyebrow">SMTP integration</p>
          <h1>Email delivery</h1>
          <p className="muted">
            SMTP settings are saved to Appwrite and verification runs through the configured Function.
          </p>
        </div>
        <StatusPill tone={form.status === "verified" ? "good" : form.status === "error" ? "bad" : "warn"}>{form.status}</StatusPill>
      </section>

      <form className="settings-form" onSubmit={(event) => submit(event)}>
        <div className="two-col">
          <Field label="SMTP host">
            <Input value={form.smtpHost} onChange={(event) => setForm({ ...form, smtpHost: event.target.value, status: "draft" })} />
          </Field>
          <Field label="SMTP port">
            <Input type="number" value={form.smtpPort} onChange={(event) => setForm({ ...form, smtpPort: Number(event.target.value), status: "draft" })} />
          </Field>
          <Field label="SMTP user">
            <Input value={form.smtpUser} onChange={(event) => setForm({ ...form, smtpUser: event.target.value, status: "draft" })} />
          </Field>
          <Field label="SMTP password">
            <Input type="password" value={secret} placeholder={form.encryptedSecretRef ? "Saved secret reference" : ""} onChange={(event) => setSecret(event.target.value)} />
          </Field>
          <Field label="From name">
            <Input value={form.fromName} onChange={(event) => setForm({ ...form, fromName: event.target.value, status: "draft" })} />
          </Field>
          <Field label="From email">
            <Input type="email" value={form.fromEmail} onChange={(event) => setForm({ ...form, fromEmail: event.target.value, status: "draft" })} />
          </Field>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="row-actions">
          <Button type="submit">Save SMTP</Button>
          <Button type="button" variant="secondary" onClick={(event) => submit(event, true)}>
            Test connection
          </Button>
        </div>
      </form>
    </main>
  );
}

function emptyIntegration(ownerId: string): Integration {
  return {
    id: createId("integration"),
    ownerId,
    providerType: "smtp",
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    fromName: "Bloom",
    fromEmail: "",
    status: "draft",
  };
}
