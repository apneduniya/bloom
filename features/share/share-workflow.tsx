"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status-pill";
import { resolveTokens } from "@/lib/tokens/token-engine";
import { validateBloomForSend, validateEmailDraft } from "@/lib/validation/schemas";
import type { Bloom, EmailDraft, Integration, SendJob } from "@/lib/validation/types";
import {
  useBloomQuery,
  useCurrentUserQuery,
  useCreateSendJobMutation,
  useIntegrationQuery,
  useSaveBloomMutation,
  useSendJobsQuery,
} from "@/lib/appwrite/query-hooks";

export function ShareWorkflow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUserQuery = useCurrentUserQuery();
  const user = currentUserQuery.data;
  const bloomId = searchParams.get("bloomId");
  const bloomQuery = useBloomQuery(user, bloomId);
  const integrationQuery = useIntegrationQuery(user);
  const sendJobsQuery = useSendJobsQuery(user, bloomId);
  const saveBloomMutation = useSaveBloomMutation();
  const createSendJobMutation = useCreateSendJobMutation(user);

  useEffect(() => {
    if (!currentUserQuery.isFetched) return;
    if (!bloomId) {
      router.push("/dashboard");
      return;
    }
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/share?bloomId=${bloomId}`)}`);
      return;
    }
  }, [bloomId, currentUserQuery.isFetched, router, user]);

  if (!currentUserQuery.isFetched || (user && (bloomQuery.isPending || integrationQuery.isPending || sendJobsQuery.isPending))) return <main className="page-pad">Loading share flow...</main>;
  if (bloomQuery.error) return <main className="page-pad"><p className="form-error">{bloomQuery.error instanceof Error ? bloomQuery.error.message : "Could not load Bloom."}</p></main>;
  if (integrationQuery.error) return <main className="page-pad"><p className="form-error">{integrationQuery.error instanceof Error ? integrationQuery.error.message : "Could not load SMTP integration."}</p></main>;
  if (!user) return <main className="page-pad">Redirecting to sign in...</main>;
  if (!bloomQuery.data) return <main className="page-pad">Loading share flow...</main>;

  return (
    <ShareWorkflowForm
      key={bloomQuery.data.id}
      bloom={bloomQuery.data}
      integration={integrationQuery.data ?? null}
      jobs={sendJobsQuery.data ?? []}
      saveBloomMutation={saveBloomMutation}
      createSendJobMutation={createSendJobMutation}
    />
  );
}

function ShareWorkflowForm({
  bloom,
  integration,
  jobs,
  saveBloomMutation,
  createSendJobMutation,
}: {
  bloom: Bloom;
  integration: Integration | null;
  jobs: SendJob[];
  saveBloomMutation: ReturnType<typeof useSaveBloomMutation>;
  createSendJobMutation: ReturnType<typeof useCreateSendJobMutation>;
}) {
  const [draftBloom, setDraftBloom] = useState<Bloom>(bloom);
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(Math.max(1, bloom.dataSource?.rowCount ?? 1));
  const [error, setError] = useState("");

  async function saveDraft(nextDraft: EmailDraft) {
    const nextBloom = { ...draftBloom, emailDraft: nextDraft };
    setDraftBloom(nextBloom);
    try {
      const saved = await saveBloomMutation.mutateAsync(nextBloom);
      setDraftBloom(saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save email draft.");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!integration) return;
    const nextBloom: Bloom = { ...draftBloom, emailDraft: draftBloom.emailDraft };
    const sendValidation = validateBloomForSend(nextBloom);
    const draftValidation = validateEmailDraft(nextBloom.emailDraft, bloom.dataSource?.columnNames ?? []);
    const errors = [...(!sendValidation.ok ? sendValidation.errors : []), ...(!draftValidation.ok ? draftValidation.errors : [])];
    if (integration.status !== "verified") errors.push("Verify SMTP integration before sending.");
    if (!bloom.lastSavedAt) errors.push("Save the Bloom before sending.");
    if (errors.length) {
      setError(errors.join(" "));
      return;
    }

    const rowCount = bloom.dataSource?.rowCount ?? 1;
    const safeStart = Math.max(1, Math.min(rangeStart, rowCount));
    const safeEnd = Math.max(safeStart, Math.min(rangeEnd, rowCount));
    try {
      await createSendJobMutation.mutateAsync({ bloom: nextBloom, integration, fromIndex: safeStart - 1, toIndex: safeEnd - 1 });
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create send job.");
    }
  }

  const firstRow = bloom.dataSource?.rows[0] ?? {};
  const draft = draftBloom.emailDraft;

  return (
    <main className="share-page">
      <section className="settings-heading">
        <div>
          <p className="eyebrow">Share Bloom</p>
          <h1>{draftBloom.title}</h1>
          <p className="muted">Resolve merge tags, attach personalized certificates, and track each recipient.</p>
        </div>
        <div className="row-actions">
          <Link className="button button-secondary" href={`/editor?bloomId=${draftBloom.id}`}>
            Back to editor
          </Link>
          <Link className="button button-secondary" href="/integrations">
            SMTP settings
          </Link>
        </div>
      </section>

      <div className="share-grid">
        <form className="settings-form" onSubmit={submit}>
          <Field label="To">
            <Input value={draft.toFieldMapping} onChange={(event) => void saveDraft({ ...draft, toFieldMapping: event.target.value })} />
          </Field>
          <div className="two-col">
            <Field label="CC">
              <Input value={draft.cc} onChange={(event) => void saveDraft({ ...draft, cc: event.target.value })} />
            </Field>
            <Field label="BCC">
              <Input value={draft.bcc} onChange={(event) => void saveDraft({ ...draft, bcc: event.target.value })} />
            </Field>
          </div>
          <Field label="Subject">
            <Input value={draft.subject} onChange={(event) => void saveDraft({ ...draft, subject: event.target.value })} />
          </Field>
          <Field label="Body">
            <Textarea rows={9} value={draft.body} onChange={(event) => void saveDraft({ ...draft, body: event.target.value })} />
          </Field>
          <div className="two-col">
            <Field label="Attachment filename">
              <Input value={draft.attachmentFilename} onChange={(event) => void saveDraft({ ...draft, attachmentFilename: event.target.value })} />
            </Field>
            <Field label="Row range">
              <div className="range-row">
                <Input type="number" min="1" max={bloom.dataSource?.rowCount ?? 1} value={rangeStart} onChange={(event) => setRangeStart(Number(event.target.value))} />
                <Input type="number" min={rangeStart} max={bloom.dataSource?.rowCount ?? 1} value={rangeEnd} onChange={(event) => setRangeEnd(Number(event.target.value))} />
              </div>
            </Field>
          </div>
          <label className="checkline">
            <input type="checkbox" checked={draft.attachmentsEnabled} onChange={(event) => void saveDraft({ ...draft, attachmentsEnabled: event.target.checked })} />
            Attach generated PNG certificate
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <Button type="submit">Create send job</Button>
        </form>

        <aside className="preview-panel">
          <h2>Email preview</h2>
          <p className="meta">To: {resolveTokens(draft.toFieldMapping, firstRow) || "missing recipient"}</p>
          <h3>{resolveTokens(draft.subject, firstRow)}</h3>
          <pre>{resolveTokens(draft.body, firstRow)}</pre>
          <p className="meta">
            Attachment: {draft.attachmentsEnabled ? `${resolveTokens(draft.attachmentFilename, firstRow)}.png` : "disabled"}
          </p>
          <h2>Send jobs</h2>
          <SendJobs jobs={jobs} />
        </aside>
      </div>
    </main>
  );
}

function SendJobs({ jobs }: { jobs: SendJob[] }) {
  if (!jobs.length) return <p className="muted">No send jobs yet.</p>;
  return (
    <div className="job-list">
      {jobs.map((job) => (
        <article className="job-card" key={job.id}>
          <div className="card-title-row">
            <strong>{job.processedRows}/{job.totalRows} processed</strong>
            <StatusPill tone={job.status === "completed" ? "good" : job.status === "failed" ? "bad" : "warn"}>{job.status}</StatusPill>
          </div>
          <progress max={job.totalRows} value={job.processedRows} />
          <p className="meta">{job.failedRows} failed · created {new Date(job.createdAt).toLocaleString()}</p>
          <div className="job-rows">
            {job.rows.slice(0, 6).map((row) => (
              <span key={row.id} className={`row-status row-${row.status}`}>
                {row.rowIndex + 1}. {row.recipient || "missing"} · {row.status}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
