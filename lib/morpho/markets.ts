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
      loanAsset { symbol }
      collateralAsset { symbol }
      lltv
      state {
        supplyAssetsUsd
        borrowAssetsUsd
        utilization
        netSupplyApy
        netBorrowApy
      }
      }
    }
  }
`;

type MarketsResponse = {
  markets: {
    items: Market[];
  };
};

export async function getMarkets(chainId: number[], first: number = 100): Promise<Market[]> {
  const data = await query<MarketsResponse>(MARKETS_QUERY, {
    chainId,
    first,
  });

  return data.markets.items.filter(
    (market) => market.loanAsset !== null && market.collateralAsset !== null && market.state !== null && market.state.supplyAssetsUsd > 0 && market.state.borrowAssetsUsd > 0
  );
}

