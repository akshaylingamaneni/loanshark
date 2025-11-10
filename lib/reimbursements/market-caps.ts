import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { markets as marketsTable } from "@/lib/db/schema";
import { getMarkets } from "@/lib/morpho/markets";
import type { Market } from "@/lib/morpho/types";

export type MarketCapConfig = {
  chainId: number;
  capApr: number;
  label: string;
};

export const DEFAULT_MARKET_CAPS: Record<string, MarketCapConfig> = {
  "0x1947267c49c3629c5ed59c88c411e8cf28c4d2afdb5da046dc8e3846a4761794": {
    chainId: 137,
    capApr: 0.011,
    label: "MaticX/USDC",
  },
  "0x1cfe584af3db05c7f39d60e458a87a8b2f6b5d8c6125631984ec489f1d13553b": {
    chainId: 137,
    capApr: 0.012,
    label: "WBTC/USDC",
  },
  "0xb8ae474af3b91c8143303723618b31683b52e9c86566aa54c06f0bc27906bcae": {
    chainId: 137,
    capApr: 0.012,
    label: "wstETH/WETH",
  },
};

export async function getTrackedMarketCaps(): Promise<Record<string, MarketCapConfig>> {
  const tracked = await db.query.markets.findMany({
    where: eq(marketsTable.isTracked, true),
  });

  if (tracked.length === 0) {
    return { ...DEFAULT_MARKET_CAPS };
  }

  return tracked.reduce<Record<string, MarketCapConfig>>((acc, market) => {
    acc[market.uniqueKey] = {
      chainId: market.chainId,
      capApr: market.aprCapBps / 10_000,
      label: `${market.collateralSymbol}/${market.loanSymbol}`,
    };
    return acc;
  }, {});
}

export type ManagedMarket = Market & {
  isTracked: boolean;
  capApr: number | null;
  suggestedCapApr: number | null;
};

export async function getManagedMarkets(
  chainIds: number[] = [137],
  first: number = 250
): Promise<ManagedMarket[]> {
  const [remoteMarkets, tracked] = await Promise.all([
    getMarkets(chainIds, first),
    db.query.markets.findMany(),
  ]);

  const trackedMap = new Map(tracked.map((market) => [market.uniqueKey, market]));

  return remoteMarkets.map((market) => {
    const trackedEntry = trackedMap.get(market.uniqueKey);
    const suggestedCap = DEFAULT_MARKET_CAPS[market.uniqueKey]?.capApr ?? null;

    return {
      ...market,
      isTracked: trackedEntry?.isTracked ?? false,
      capApr: trackedEntry ? trackedEntry.aprCapBps / 10_000 : null,
      suggestedCapApr: suggestedCap,
    };
  });
}
