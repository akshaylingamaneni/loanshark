import { query } from "./client";
import type { BorrowerData, MarketPosition, MarketState } from "./types";
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
      state { borrowApy }
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
  marketKey: string,
  chainId: number
): Promise<BorrowerData[]> {
  const data = await query<BorrowersResponse>(BORROWERS_QUERY, {
    key: marketKey,
    cid: chainId,
  });

  const borrowApy = data.marketByUniqueKey.state.borrowApy;

  return data.marketPositions.items.map((position) => ({
    address: position.user.address,
    marketKey,
    borrowShares: position.state.borrowShares,
    borrowAssets: position.state.borrowAssets,
    borrowAssetsUsd: position.state.borrowAssetsUsd,
    borrowApy,
  }));
}

export async function getAllBorrowers(chainId: number = 137): Promise<BorrowerData[]> {
  const markets = await getMarkets([chainId]);
  const allBorrowers = await Promise.all(
    markets.map((market) => getBorrowersForMarket(market.uniqueKey, chainId))
  );

  return allBorrowers.flat();
}

