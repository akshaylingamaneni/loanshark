import { query } from "./client";
import type { Market } from "./types";

const MARKETS_QUERY = `
  query Markets($chainId: [Int!]!, $first: Int!) {
    markets(
      first: $first
      where: { chainId_in: $chainId, whitelisted: true }
      orderBy: SupplyAssetsUsd
      orderDirection: Desc
    ) {
      items {
        uniqueKey
        loanAsset { symbol address decimals }
        collateralAsset { symbol address decimals }
        lltv
        state {
          supplyAssetsUsd
          borrowAssetsUsd
          utilization
          borrowApy
          netSupplyApy
          netBorrowApy
        }
      }
    }
  }
`;

type MarketResponse = {
  uniqueKey: string;
  loanAsset: { symbol: string; address: string; decimals: number } | null;
  collateralAsset: { symbol: string; address: string; decimals: number } | null;
  lltv: string;
  state: {
    supplyAssetsUsd: number;
    borrowAssetsUsd: number;
    utilization: number;
    borrowApy: number;
    netSupplyApy: number;
    netBorrowApy: number;
  } | null;
};

type MarketsResponse = {
  markets: {
    items: MarketResponse[];
  };
};

export async function getMarkets(chainId: number[], first: number = 100): Promise<Market[]> {
  const data = await query<MarketsResponse>(MARKETS_QUERY, {
    chainId,
    first,
  });

  return data.markets.items
    .filter(
      (market) =>
        market.loanAsset !== null &&
        market.collateralAsset !== null &&
        market.state !== null &&
        market.state.supplyAssetsUsd > 0 &&
        market.state.borrowAssetsUsd > 0
    )
    .map((market) => ({
      uniqueKey: market.uniqueKey,
      loanAsset: market.loanAsset!,
      collateralAsset: market.collateralAsset!,
      lltv: market.lltv,
      state: market.state!,
    }));
}
