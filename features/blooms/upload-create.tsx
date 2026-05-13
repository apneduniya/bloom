"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCurrentUserQuery, useCreateBloomMutation } from "@/lib/appwrite/query-hooks";
import { validatePng } from "@/lib/validation/schemas";

export function UploadCreate({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const currentUserQuery = useCurrentUserQuery();
  const createBloomMutation = useCreateBloomMutation(currentUserQuery.data);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validatePng(file);
    if (!validation.ok) {
      setError(validation.errors.join(" "));
      return;
    }

    setBusy(true);
    setError("");
    try {
      const dataUrl = await readFile(file);
      const dimensions = await readImageDimensions(dataUrl);
      const user = currentUserQuery.data;
      if (!user) {
        window.sessionStorage.setItem("bloom:pending-upload", JSON.stringify({ name: file.name, dataUrl, ...dimensions }));
        router.push("/login?next=/dashboard");
        return;
      }
      const bloom = await createBloomMutation.mutateAsync({ file, width: dimensions.width, height: dimensions.height });
      router.push(`/editor?bloomId=${bloom.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create Bloom.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={compact ? "upload-compact" : "upload-card"}>
      <input id={compact ? "png-upload-compact" : "png-upload"} type="file" accept="image/png" onChange={handleFile} hidden />
      <Button type="button" disabled={busy || createBloomMutation.isPending} onClick={() => document.getElementById(compact ? "png-upload-compact" : "png-upload")?.click()}>
        {busy ? "Creating..." : "Upload certificate PNG"}
      </Button>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read PNG file."));
    reader.readAsDataURL(file);
  });
}

function readImageDimensions(dataUrl: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("The PNG image appears to be broken."));
    image.src = dataUrl;
  });
}
