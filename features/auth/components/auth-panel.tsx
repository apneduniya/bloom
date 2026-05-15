"use client";

import { useRouter, useSearchParams } from "next/navigation";
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
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { authSessionService } from "@/features/auth/services/auth-session-service";
import { useState } from "react";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type FormValues = z.infer<typeof schema>;

export function AuthPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUserQuery = useCurrentUser();
  const logoutMutation = useLogout();
  const user = currentUserQuery.data;
  const [status, setStatus] = useState("");
  const next = searchParams.get("next") ?? "/dashboard";

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: user?.email ?? "" },
  });

  async function onSubmit({ email }: FormValues) {
    setStatus("");
    try {
      await authSessionService.requestMagicLink(email.trim(), next);
      setStatus("Check your email for the Bloom sign-in link.");
    } catch (cause) {
      form.setError("email", {
        message: cause instanceof Error ? cause.message : "Could not send sign-in link.",
      });
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="stack">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {status ? <p className="success-note">{status}</p> : null}

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Sending..." : "Email magic link"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => authSessionService.startGoogleOAuth(next)}
            >
              Continue with Google
            </Button>

            {currentUserQuery.isFetched && user ? (
              <Button type="button" variant="ghost" className="w-full" onClick={handleLogout}>
                Log out {user.email}
              </Button>
            ) : null}
          </form>
        </Form>
      </section>
    </main>
  );
}
