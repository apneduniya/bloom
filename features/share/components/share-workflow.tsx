"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusPill } from "@/components/ui/status-pill";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { useBloom } from "@/features/blooms/hooks/use-bloom";
import { useSaveBloom } from "@/features/blooms/hooks/use-save-bloom";
import { validateBloomForSend } from "@/features/blooms/services/bloom-validator";
import type { Bloom, EmailDraft } from "@/features/blooms/types";
import { useIntegration } from "@/features/integrations/hooks/use-integration";
import type { Integration } from "@/features/integrations/types";
import { useCreateSendJob } from "@/features/send-jobs/hooks/use-create-send-job";
import { useSendJobs } from "@/features/send-jobs/hooks/use-send-jobs";
import type { SendJob } from "@/features/send-jobs/types";
import { resolveTokens } from "@/lib/tokens/token-engine";

const schema = z.object({
  toFieldMapping: z.string().min(1, "To field is required"),
  cc: z.string(),
  bcc: z.string(),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  attachmentFilename: z.string(),
  attachmentsEnabled: z.boolean(),
  rangeStart: z.string(),
  rangeEnd: z.string(),
});

type FormValues = z.infer<typeof schema>;

export function ShareWorkflow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUserQuery = useCurrentUser();
  const user = currentUserQuery.data;
  const bloomId = searchParams.get("bloomId");
  const bloomQuery = useBloom(user?.id, bloomId);
  const integrationQuery = useIntegration(user?.id);
  const sendJobsQuery = useSendJobs(user?.id, bloomId);
  const saveBloomMutation = useSaveBloom();
  const createSendJobMutation = useCreateSendJob(user);

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

  if (
    !currentUserQuery.isFetched ||
    (user &&
      (bloomQuery.isPending || integrationQuery.isPending || sendJobsQuery.isPending))
  )
    return <main className="page-pad">Loading share flow...</main>;

  if (bloomQuery.error)
    return (
      <main className="page-pad">
        <p className="form-error">
          {bloomQuery.error instanceof Error
            ? bloomQuery.error.message
            : "Could not load Bloom."}
        </p>
      </main>
    );

  if (integrationQuery.error)
    return (
      <main className="page-pad">
        <p className="form-error">
          {integrationQuery.error instanceof Error
            ? integrationQuery.error.message
            : "Could not load SMTP integration."}
        </p>
      </main>
    );

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
  saveBloomMutation: ReturnType<typeof useSaveBloom>;
  createSendJobMutation: ReturnType<typeof useCreateSendJob>;
}) {
  const rowCount = bloom.dataSource?.rowCount ?? 1;
  const draft = bloom.emailDraft;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      toFieldMapping: draft?.toFieldMapping ?? "",
      cc: draft?.cc ?? "",
      bcc: draft?.bcc ?? "",
      subject: draft?.subject ?? "",
      body: draft?.body ?? "",
      attachmentFilename: draft?.attachmentFilename ?? "",
      attachmentsEnabled: draft?.attachmentsEnabled ?? false,
      rangeStart: "1",
      rangeEnd: String(Math.max(1, rowCount)),
    },
  });

  async function autosaveDraft(partial: Partial<EmailDraft>) {
    const existing = bloom.emailDraft;
    const nextDraft: EmailDraft = {
      id: existing.id,
      bloomId: existing.bloomId,
      toFieldMapping: form.getValues("toFieldMapping"),
      cc: form.getValues("cc"),
      bcc: form.getValues("bcc"),
      subject: form.getValues("subject"),
      body: form.getValues("body"),
      attachmentFilename: form.getValues("attachmentFilename"),
      attachmentsEnabled: form.getValues("attachmentsEnabled"),
      ...partial,
    };
    try {
      await saveBloomMutation.mutateAsync({ ...bloom, emailDraft: nextDraft });
    } catch {
      // autosave is best-effort; main submit handles explicit errors
    }
  }

  async function onSubmit(values: FormValues) {
    if (!integration) return;

    const sendValidation = validateBloomForSend(bloom);
    if (!sendValidation.ok) {
      form.setError("root", { message: sendValidation.errors.join(" ") });
      return;
    }
    if (integration.status !== "verified") {
      form.setError("root", { message: "Verify SMTP integration before sending." });
      return;
    }
    if (!bloom.lastSavedAt) {
      form.setError("root", { message: "Save the Bloom before sending." });
      return;
    }

    const safeStart = Math.max(1, Math.min(Number(values.rangeStart), rowCount));
    const safeEnd = Math.max(safeStart, Math.min(Number(values.rangeEnd), rowCount));

    try {
      await createSendJobMutation.mutateAsync({
        bloom,
        integration,
        fromIndex: safeStart - 1,
        toIndex: safeEnd - 1,
      });
    } catch (cause) {
      form.setError("root", {
        message: cause instanceof Error ? cause.message : "Could not create send job.",
      });
    }
  }

  const firstRow = bloom.dataSource?.rows[0] ?? {};
  const watched = form.watch();

  return (
    <main className="share-page">
      <section className="settings-heading">
        <div>
          <p className="eyebrow">Share Bloom</p>
          <h1>{bloom.title}</h1>
          <p className="muted">
            Resolve merge tags, attach personalized certificates, and track each recipient.
          </p>
        </div>
        <div className="row-actions">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/editor?bloomId=${bloom.id}`}>Back to editor</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/integrations">SMTP settings</Link>
          </Button>
        </div>
      </section>

      <div className="share-grid">
        <Form {...form}>
          <form className="settings-form" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="toFieldMapping"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        void autosaveDraft({ toFieldMapping: e.target.value });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="two-col">
              <FormField
                control={form.control}
                name="cc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CC</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          void autosaveDraft({ cc: e.target.value });
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bcc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BCC</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          void autosaveDraft({ bcc: e.target.value });
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        void autosaveDraft({ subject: e.target.value });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Body</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={9}
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        void autosaveDraft({ body: e.target.value });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="two-col">
              <FormField
                control={form.control}
                name="attachmentFilename"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attachment filename</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          void autosaveDraft({ attachmentFilename: e.target.value });
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rangeStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Row range</FormLabel>
                    <FormControl>
                      <div className="range-row">
                        <Input
                          type="number"
                          min="1"
                          max={rowCount}
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            const start = Number(e.target.value);
                            const end = Number(form.getValues("rangeEnd"));
                            if (start > end) form.setValue("rangeEnd", String(start));
                          }}
                        />
                        <FormField
                          control={form.control}
                          name="rangeEnd"
                          render={({ field: endField }) => (
                            <Input
                              type="number"
                              min={watched.rangeStart}
                              max={String(rowCount)}
                              {...endField}
                            />
                          )}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="attachmentsEnabled"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <label className="checkline">
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => {
                          field.onChange(e);
                          void autosaveDraft({ attachmentsEnabled: e.target.checked });
                        }}
                      />
                      Attach generated PNG certificate
                    </label>
                  </FormControl>
                </FormItem>
              )}
            />

            {form.formState.errors.root ? (
              <p className="form-error">{form.formState.errors.root.message}</p>
            ) : null}

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Creating..." : "Create send job"}
            </Button>
          </form>
        </Form>

        <aside className="preview-panel">
          <h2>Email preview</h2>
          <p className="meta">
            To: {resolveTokens(watched.toFieldMapping, firstRow) || "missing recipient"}
          </p>
          <h3>{resolveTokens(watched.subject, firstRow)}</h3>
          <pre>{resolveTokens(watched.body, firstRow)}</pre>
          <p className="meta">
            Attachment:{" "}
            {watched.attachmentsEnabled
              ? `${resolveTokens(watched.attachmentFilename, firstRow)}.png`
              : "disabled"}
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
            <strong>
              {job.processedRows}/{job.totalRows} processed
            </strong>
            <StatusPill
              tone={
                job.status === "completed" ? "good" : job.status === "failed" ? "bad" : "warn"
              }
            >
              {job.status}
            </StatusPill>
          </div>
          <progress max={job.totalRows} value={job.processedRows} />
          <p className="meta">
            {job.failedRows} failed · created {new Date(job.createdAt).toLocaleString()}
          </p>
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
