"use client";

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
import { StatusPill } from "@/components/ui/status-pill";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import type { User } from "@/features/auth/types";
import { useIntegration } from "@/features/integrations/hooks/use-integration";
import { useSaveIntegration } from "@/features/integrations/hooks/use-save-integration";
import { useTestIntegration } from "@/features/integrations/hooks/use-test-integration";
import type { Integration } from "@/features/integrations/types";
import { createId } from "@/lib/utils";

const schema = z.object({
  smtpHost: z.string().min(1, "SMTP host is required"),
  smtpPort: z
    .string()
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 1 && Number(v) <= 65535, {
      message: "Port must be 1–65535",
    }),
  smtpUser: z.string().min(1, "SMTP user is required"),
  smtpPassword: z.string().optional(),
  fromName: z.string().min(1, "From name is required"),
  fromEmail: z.string().email("Must be a valid email"),
});

type FormValues = z.infer<typeof schema>;

export function IntegrationsPanel() {
  const currentUserQuery = useCurrentUser();
  const user = currentUserQuery.data;
  const integrationQuery = useIntegration(user?.id);
  if (!currentUserQuery.isFetched || (user && integrationQuery.isPending))
    return <main className="page-pad">Loading integration...</main>;
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

  return (
    <IntegrationsForm
      key={user.id}
      user={user}
      initialIntegration={integrationQuery.data ?? null}
    />
  );
}

function IntegrationsForm({
  user,
  initialIntegration,
}: {
  user: User;
  initialIntegration: Integration | null;
}) {
  const saveIntegrationMutation = useSaveIntegration(user.id);
  const testIntegrationMutation = useTestIntegration(user.id);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      smtpHost: initialIntegration?.smtpHost ?? "",
      smtpPort: String(initialIntegration?.smtpPort ?? 587),
      smtpUser: initialIntegration?.smtpUser ?? "",
      smtpPassword: "",
      fromName: initialIntegration?.fromName ?? "Bloom",
      fromEmail: initialIntegration?.fromEmail ?? "",
    },
  });

  async function submit(values: FormValues, test = false) {
    const base: Integration = {
      id: initialIntegration?.id ?? createId("integration"),
      ownerId: user.id,
      providerType: "smtp",
      smtpHost: values.smtpHost,
      smtpPort: Number(values.smtpPort),
      smtpUser: values.smtpUser,
      fromName: values.fromName,
      fromEmail: values.fromEmail,
      status: test ? "draft" : (initialIntegration?.status ?? "draft"),
      errorMessage: undefined,
    };

    try {
      if (test) {
        await testIntegrationMutation.mutateAsync({
          integration: base,
          secret: values.smtpPassword ?? "",
        });
      } else {
        await saveIntegrationMutation.mutateAsync(base);
      }
      form.setValue("smtpPassword", "");
    } catch (cause) {
      form.setError("root", {
        message:
          cause instanceof Error
            ? cause.message
            : test
              ? "Connection test failed."
              : "Could not save SMTP settings.",
      });
    }
  }

  const status = initialIntegration?.status ?? "draft";

  return (
    <main className="settings-page">
      <section className="settings-heading">
        <div>
          <p className="eyebrow">SMTP integration</p>
          <h1>Email delivery</h1>
          <p className="muted">
            SMTP settings are saved to Appwrite and verification runs through the configured
            Function.
          </p>
        </div>
        <StatusPill
          tone={status === "verified" ? "good" : status === "error" ? "bad" : "warn"}
        >
          {status}
        </StatusPill>
      </section>

      <Form {...form}>
        <form
          className="settings-form"
          onSubmit={form.handleSubmit((values) => submit(values, false))}
        >
          <div className="two-col">
            <FormField
              control={form.control}
              name="smtpHost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SMTP host</FormLabel>
                  <FormControl>
                    <Input placeholder="smtp.example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="smtpPort"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SMTP port</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="smtpUser"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SMTP user</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="smtpPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SMTP password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={
                        initialIntegration?.encryptedSecretRef ? "Saved secret reference" : ""
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fromName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fromEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {form.formState.errors.root ? (
            <p className="form-error">{form.formState.errors.root.message}</p>
          ) : null}

          <div className="row-actions">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Save SMTP
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={form.formState.isSubmitting}
              onClick={form.handleSubmit((values) => submit(values, true))}
            >
              Test connection
            </Button>
          </div>
        </form>
      </Form>
    </main>
  );
}
