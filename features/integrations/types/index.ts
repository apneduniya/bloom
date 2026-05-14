export type Integration = {
  id: string;
  ownerId: string;
  providerType: "smtp";
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  fromName: string;
  fromEmail: string;
  encryptedSecretRef?: string;
  status: "draft" | "verified" | "error";
  lastTestedAt?: string;
  errorMessage?: string;
};
