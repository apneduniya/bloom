import { Suspense } from "react";
import { AuthPanel } from "@/features/auth/components/auth-panel";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="page-pad">Loading login...</main>}>
      <AuthPanel />
    </Suspense>
  );
}
