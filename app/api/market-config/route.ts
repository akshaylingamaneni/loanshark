import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import {
  markets as marketsTable,
} from "@/lib/db/schema";
import { getMarketByUniqueKey } from "@/lib/morpho/markets";
import {
  DEFAULT_MARKET_CAPS,
  getManagedMarkets,
} from "@/lib/reimbursements/market-caps";

function normalizeCapApr(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

export async function GET() {
  try {
    const markets = await getManagedMarkets();
    return NextResponse.json({ markets });
  } catch (error) {
    console.error("Failed to load market configuration", error);
    return NextResponse.json({ error: "Unable to load markets" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const uniqueKey = body?.uniqueKey;
    const chainId = Number(body?.chainId ?? 137);
    const isTracked = body?.isTracked ?? true;
    let capApr = normalizeCapApr(body?.capApr);

    if (!uniqueKey || typeof uniqueKey !== "string") {
      return NextResponse.json({ error: "uniqueKey is required" }, { status: 400 });
    }

    if (!Number.isFinite(chainId)) {
      return NextResponse.json({ error: "chainId must be a number" }, { status: 400 });
    }

    if (isTracked && capApr <= 0) {
      const fallback = DEFAULT_MARKET_CAPS[uniqueKey]?.capApr;
      if (fallback) {
        capApr = fallback;
      } else {
        return NextResponse.json(
          { error: "capApr must be greater than 0 for tracked markets" },
          { status: 400 }
        );
      }
    }

    const market = await getMarketByUniqueKey(uniqueKey, chainId);
    if (!market) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }

    await db
      .insert(marketsTable)
      .values({
        uniqueKey: market.uniqueKey,
        chainId,
        collateralSymbol: market.collateralAsset.symbol,
        collateralAddress: market.collateralAsset.address,
        collateralDecimals: market.collateralAsset.decimals,
        loanSymbol: market.loanAsset.symbol,
        loanAddress: market.loanAsset.address,
        loanDecimals: market.loanAsset.decimals,
        lltv: market.lltv,
        aprCapBps: Math.round(capApr * 10_000),
        isTracked: Boolean(isTracked),
      })
      .onConflictDoUpdate({
        target: marketsTable.uniqueKey,
        set: {
          chainId,
          collateralSymbol: market.collateralAsset.symbol,
          collateralAddress: market.collateralAsset.address,
          collateralDecimals: market.collateralAsset.decimals,
          loanSymbol: market.loanAsset.symbol,
          loanAddress: market.loanAsset.address,
          loanDecimals: market.loanAsset.decimals,
          lltv: market.lltv,
          aprCapBps: Math.round(capApr * 10_000),
          isTracked: Boolean(isTracked),
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({
      market: {
        uniqueKey,
        capApr,
        isTracked: Boolean(isTracked),
      },
    });
  } catch (error) {
    console.error("Failed to update market configuration", error);
    return NextResponse.json({ error: "Unable to update market" }, { status: 500 });
  }
}
