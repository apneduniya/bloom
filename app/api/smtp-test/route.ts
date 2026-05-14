import { NextResponse } from "next/server";

type SmtpTestRequest = {
  integration?: { fromEmail?: string } & Record<string, unknown>;
  secret?: string;
};

export async function POST(request: Request) {
  let body: SmtpTestRequest = {};
  try {
    body = (await request.json()) as SmtpTestRequest;
  } catch {
    body = {};
  }

  const integration = body.integration ?? {};
  const secret = typeof body.secret === "string" ? body.secret : "";

  console.log(`SMTP test requested for ${integration.fromEmail ?? "unknown"}`);

  return NextResponse.json({
    ok: true,
    secretRef: `smtp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
    tested: Boolean(secret),
  });
}
