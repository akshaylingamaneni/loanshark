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
        loanAsset { symbol address decimals priceUsd }
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

const MARKET_BY_KEY_QUERY = `
  query MarketByKey($uniqueKey: String!, $chainId: Int!) {
    marketByUniqueKey(uniqueKey: $uniqueKey, chainId: $chainId) {
      uniqueKey
      loanAsset { symbol address decimals priceUsd }
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
`;

type MarketResponse = {
  uniqueKey: string;
  loanAsset: { symbol: string; address: string; decimals: number; priceUsd?: number | null } | null;
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

type MarketByKeyResponse = {
  marketByUniqueKey: MarketResponse | null;
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
      chainId: chainId[0] ?? 137,
      loanAsset: market.loanAsset!,
      collateralAsset: market.collateralAsset!,
      lltv: market.lltv,
      state: market.state!,
    }));
}

export async function getMarketByUniqueKey(
  uniqueKey: string,
  chainId: number
): Promise<Market | null> {
  const data = await query<MarketByKeyResponse>(MARKET_BY_KEY_QUERY, {
    uniqueKey,
    chainId,
  });

  const market = data.marketByUniqueKey;
  if (!market || !market.loanAsset || !market.collateralAsset || !market.state) {
    return null;
  }

  return {
    uniqueKey: market.uniqueKey,
    chainId,
    loanAsset: market.loanAsset,
    collateralAsset: market.collateralAsset,
    lltv: market.lltv,
    state: market.state,
  };
}
