import { Suspense } from "react";
import { AppShell } from "@/components/ui/app-shell";
import { ShareWorkflow } from "@/features/share/share-workflow";

export default function SharePage() {
  return (
    <AppShell>
      <Suspense fallback={<main className="page-pad">Loading share flow...</main>}>
        <ShareWorkflow />
      </Suspense>
    </AppShell>
  );
}
