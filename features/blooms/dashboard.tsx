"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { UploadCreate } from "@/features/blooms/upload-create";
import { dataUrlToFile } from "@/lib/appwrite/files";
import { useBloomsQuery, useCreateBloomMutation, useCurrentUserQuery, useDeleteBloomMutation } from "@/lib/appwrite/query-hooks";

export function Dashboard() {
  const router = useRouter();
  const currentUserQuery = useCurrentUserQuery();
  const user = currentUserQuery.data;
  const bloomsQuery = useBloomsQuery(user);
  const createBloomMutation = useCreateBloomMutation(user);
  const deleteBloomMutation = useDeleteBloomMutation();
  const [error, setError] = useState("");
  const pendingUploadStarted = useRef(false);
  const blooms = bloomsQuery.data ?? [];

  useEffect(() => {
    if (!currentUserQuery.isFetched) return;
    if (!user) {
      router.push("/login?next=/dashboard");
      return;
    }
    const pendingRaw = window.sessionStorage.getItem("bloom:pending-upload");
    if (pendingRaw && !pendingUploadStarted.current) {
      pendingUploadStarted.current = true;
      const pending = JSON.parse(pendingRaw) as { name: string; dataUrl: string; width: number; height: number };
      const file = dataUrlToFile(pending.dataUrl, pending.name);
      createBloomMutation
        .mutateAsync({ file, width: pending.width, height: pending.height })
        .then((bloom) => {
          window.sessionStorage.removeItem("bloom:pending-upload");
          pendingUploadStarted.current = false;
          router.push(`/editor?bloomId=${bloom.id}`);
        })
        .catch((cause: unknown) => {
          pendingUploadStarted.current = false;
          setError(cause instanceof Error ? cause.message : "Could not create Bloom.");
        });
    }
  }, [createBloomMutation, currentUserQuery.isFetched, router, user]);

  async function handleDelete(id: string) {
    await deleteBloomMutation.mutateAsync(id);
  }

  if (!currentUserQuery.isFetched || (user && bloomsQuery.isPending)) return <main className="page-pad">Loading workspace...</main>;
  if (bloomsQuery.error) return <main className="page-pad"><p className="form-error">{bloomsQuery.error instanceof Error ? bloomsQuery.error.message : "Could not load Blooms."}</p></main>;
  if (!user) return <main className="page-pad">Redirecting to sign in...</main>;

  return (
    <main className="dashboard">
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">My Blooms</p>
          <h1>Certificate campaigns</h1>
          <p className="muted">Create, personalize, export, and send certificates from one workspace.</p>
        </div>
        <UploadCreate compact />
      </section>
      {error ? <p className="form-error">{error}</p> : null}

      <section className="bloom-grid">
        {blooms.length ? (
          blooms.map((bloom) => (
            <article className="bloom-card" key={bloom.id}>
              {/* eslint-disable-next-line @next/next/no-img-element -- Appwrite private file URLs rely on the active browser session. */}
              <img src={bloom.templateImageDataUrl} alt="" />
              <div>
                <div className="card-title-row">
                  <h2>{bloom.title}</h2>
                  <StatusPill tone={bloom.status === "sent" ? "good" : "neutral"}>{bloom.status}</StatusPill>
                </div>
                <p className="muted">{bloom.description}</p>
                <p className="meta">
                  {bloom.layers.length} layers · {bloom.dataSource?.rowCount ?? 0} rows · saved{" "}
                  {bloom.lastSavedAt ? new Date(bloom.lastSavedAt).toLocaleString() : "never"}
                </p>
                <div className="row-actions">
                  <Link className="button button-primary" href={`/editor?bloomId=${bloom.id}`}>
                    Open
                  </Link>
                  <Link className="button button-secondary" href={`/share?bloomId=${bloom.id}`}>
                    Share
                  </Link>
                  <Button variant="danger" onClick={() => handleDelete(bloom.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state">
            <h2>No Blooms yet</h2>
            <p className="muted">Upload a PNG certificate template to start the editor.</p>
            <UploadCreate compact />
          </div>
        )}
      </section>
    </main>
  );
}
