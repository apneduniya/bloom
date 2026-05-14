import { NextResponse } from "next/server";

type RenderCertificateRequest = {
  bloomId?: string;
};

export async function POST(request: Request) {
  let body: RenderCertificateRequest = {};
  try {
    body = (await request.json()) as RenderCertificateRequest;
  } catch {
    body = {};
  }

  console.log(`Render certificate requested for bloom ${body.bloomId ?? "unknown"}`);

  return NextResponse.json({
    ok: true,
    rendered: false,
    note: "Render certificate stub deployed.",
  });
}
