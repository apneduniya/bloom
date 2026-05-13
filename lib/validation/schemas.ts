import type { Bloom, EmailDraft, Integration, TextLayer } from "./types";

export type ValidationResult = { ok: true } | { ok: false; errors: string[] };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validatePng(file: File): ValidationResult {
  const errors: string[] = [];
  if (file.type !== "image/png") errors.push("Upload a PNG certificate template.");
  if (file.size > 8 * 1024 * 1024) errors.push("Template PNG must be 8 MB or smaller.");
  return errors.length ? { ok: false, errors } : { ok: true };
}

export function validateLayer(layer: TextLayer): ValidationResult {
  const errors: string[] = [];
  if (!layer.name.trim()) errors.push("Layer name is required.");
  if (layer.width < 24 || layer.height < 16) errors.push("Layer size is too small.");
  if (layer.fontSize < 6 || layer.fontSize > 240) errors.push("Font size must be between 6 and 240.");
  return errors.length ? { ok: false, errors } : { ok: true };
}

export function validateIntegration(integration: Integration, secret?: string): ValidationResult {
  const errors: string[] = [];
  if (!integration.smtpHost.trim()) errors.push("SMTP host is required.");
  if (!Number.isFinite(integration.smtpPort) || integration.smtpPort < 1) errors.push("SMTP port is required.");
  if (!emailPattern.test(integration.fromEmail)) errors.push("From email must be valid.");
  if (!integration.smtpUser.trim()) errors.push("SMTP username is required.");
  if (!integration.encryptedSecretRef && !secret?.trim()) errors.push("SMTP password or app password is required.");
  return errors.length ? { ok: false, errors } : { ok: true };
}

export function validateEmailDraft(draft: EmailDraft, columns: string[]): ValidationResult {
  const errors: string[] = [];
  if (!draft.toFieldMapping.trim()) errors.push("Recipient field is required.");
  if (!draft.subject.trim()) errors.push("Subject is required.");
  if (!draft.body.trim()) errors.push("Email body is required.");
  if (draft.toFieldMapping.startsWith("{{") && !columns.includes(draft.toFieldMapping.slice(2, -2))) {
    errors.push("Recipient merge tag is not a CSV column.");
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

export function validateBloomForSend(bloom: Bloom): ValidationResult {
  const errors: string[] = [];
  if (!bloom.dataSource) errors.push("Upload a CSV before sending.");
  if (!bloom.emailDraft.toFieldMapping) errors.push("Map an email recipient before sending.");
  if (!bloom.layers.some((layer) => layer.visible)) errors.push("Certificate needs at least one visible layer.");
  return errors.length ? { ok: false, errors } : { ok: true };
}
