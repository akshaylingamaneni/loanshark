import { query } from "./client";
import type { BorrowerData, MarketPosition, MarketState, Market } from "./types";
import { getMarkets } from "./markets";

const BORROWERS_QUERY = `
  query Borrowers($key: String!, $cid: Int!) {
    marketPositions(
      first: 1000
      orderBy: BorrowShares
      orderDirection: Desc
      where: { marketUniqueKey_in: [$key], chainId_in: [$cid] }
    ) {
      items {
        user { address }
        state { borrowShares borrowAssets borrowAssetsUsd }
      }
    }
    marketByUniqueKey(uniqueKey: $key, chainId: $cid) {
      state { borrowApy netBorrowApy }
    }
  }
`;

type BorrowersResponse = {
  marketPositions: {
    items: MarketPosition[];
  };
  marketByUniqueKey: {
    state: MarketState;
  };
};

export async function getBorrowersForMarket(
  market: Market,
  chainId: number
): Promise<BorrowerData[]> {
  const data = await query<BorrowersResponse>(BORROWERS_QUERY, {
    key: market.uniqueKey,
    cid: chainId,
  });

  const { netBorrowApy } = data.marketByUniqueKey.state;

  return data.marketPositions.items.map((position) => ({
    address: position.user.address,
    marketKey: market.uniqueKey,
    borrowShares: position.state.borrowShares,
    borrowAssets: position.state.borrowAssets,
    borrowAssetsUsd: position.state.borrowAssetsUsd,
    netBorrowApy,
    market,
  }));
}

export async function getAllBorrowers(chainId: number = 137): Promise<BorrowerData[]> {
  const markets = await getMarkets([chainId]);
  const allBorrowers = await Promise.all(
    markets.map((market) => getBorrowersForMarket(market, chainId))
  );

  return allBorrowers.flat();
}
