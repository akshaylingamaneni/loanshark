import { NextResponse } from "next/server";

import { getDailyReimbursementSummary } from "@/lib/reimbursements/metrics";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dayParam = searchParams.get("day");

    const targetDay = dayParam ? new Date(dayParam) : undefined;
    const summary = await getDailyReimbursementSummary(targetDay);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Failed to load reimbursement summary", error);
    return NextResponse.json(
      { error: "Unable to fetch reimbursement summary" },
      { status: 500 }
    );
  }
}
