import { NextResponse } from "next/server";
import { getAllBorrowers, getBorrowersForMarket } from "@/lib/morpho/borrowers";
import { getMarkets } from "@/lib/morpho/markets";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const marketKey = searchParams.get("marketKey");
    const chainId = parseInt(searchParams.get("chainId") || "137");

    if (marketKey) {
      const markets = await getMarkets([chainId]);
      const market = markets.find((m) => m.uniqueKey === marketKey);
      
      if (!market) {
        return NextResponse.json(
          { error: "Market not found" },
          { status: 404 }
        );
      }

      const borrowers = await getBorrowersForMarket(market, chainId);
      return NextResponse.json({ borrowers, market });
    }

    const borrowers = await getAllBorrowers(chainId);
    return NextResponse.json({ borrowers });
  } catch (error) {
    console.error("Error fetching borrowers:", error);
    return NextResponse.json(
      { error: "Failed to fetch borrowers" },
      { status: 500 }
    );
  }
}

