import { Suspense } from "react";
import { AuthCallback } from "@/features/auth/auth-callback";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<main className="page-pad">Completing sign in...</main>}>
      <AuthCallback />
    </Suspense>
  );
}
