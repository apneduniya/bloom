import { NextResponse } from "next/server";

type SendQueueRequest = {
  bloomId?: string;
  jobId?: string;
  fromIndex?: number;
  toIndex?: number;
};

export async function POST(request: Request) {
  let body: SendQueueRequest = {};
  try {
    body = (await request.json()) as SendQueueRequest;
  } catch {
    body = {};
  }

  const fromIndex = Number.isFinite(Number(body.fromIndex)) ? Number(body.fromIndex) : 0;
  const toIndex = Number.isFinite(Number(body.toIndex)) ? Number(body.toIndex) : fromIndex;
  const totalRows = Math.max(0, toIndex - fromIndex + 1);
  const jobId =
    typeof body.jobId === "string" && body.jobId
      ? body.jobId
      : `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

  console.log(`Send queue requested for bloom ${body.bloomId ?? "unknown"}`);

  return NextResponse.json({
    jobId,
    status: "queued",
    totalRows,
    processedRows: 0,
    failedRows: 0,
  });
}
