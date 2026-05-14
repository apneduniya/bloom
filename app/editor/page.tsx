import { Suspense } from "react";
import { AppShell } from "@/components/ui/app-shell";
import { EditorWorkspace } from "@/features/editor/components/editor-workspace";

export default function EditorPage() {
  return (
    <AppShell>
      <Suspense fallback={<main className="page-pad">Loading editor...</main>}>
        <EditorWorkspace />
      </Suspense>
    </AppShell>
  );
}
