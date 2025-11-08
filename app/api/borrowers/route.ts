import { NextResponse } from "next/server";
import { getAllBorrowers } from "@/lib/morpho/borrowers";

export async function GET() {
  try {
    const borrowers = await getAllBorrowers();
    return NextResponse.json({ borrowers });
  } catch (error) {
    console.error("Error fetching borrowers:", error);
    return NextResponse.json(
      { error: "Failed to fetch borrowers" },
      { status: 500 }
    );
  }
}

