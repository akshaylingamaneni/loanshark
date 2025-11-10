import { NextResponse } from "next/server";

import { parseJobDate, runReimbursementJob } from "@/lib/reimbursements/runner";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const dateInput = typeof body?.date === "string" ? body.date : undefined;
    const targetDate = dateInput ? parseJobDate(dateInput) : undefined;

    const result = await runReimbursementJob({ day: targetDate });
    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Invalid date")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Failed to run reimbursement job", error);
    return NextResponse.json({ error: "Unable to run reimbursement job" }, { status: 500 });
  }
}
