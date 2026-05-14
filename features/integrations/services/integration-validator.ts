import type { Integration } from "@/features/integrations/types";

export type ValidationResult = { ok: true } | { ok: false; errors: string[] };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateIntegration(integration: Integration, secret?: string): ValidationResult {
  const errors: string[] = [];
  if (!integration.smtpHost.trim()) errors.push("SMTP host is required.");
  if (!Number.isFinite(integration.smtpPort) || integration.smtpPort < 1) errors.push("SMTP port is required.");
  if (!emailPattern.test(integration.fromEmail)) errors.push("From email must be valid.");
  if (!integration.smtpUser.trim()) errors.push("SMTP username is required.");
  if (!integration.encryptedSecretRef && !secret?.trim()) errors.push("SMTP password or app password is required.");
  return errors.length ? { ok: false, errors } : { ok: true };
}
