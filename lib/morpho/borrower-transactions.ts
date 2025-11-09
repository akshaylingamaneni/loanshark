import { query } from "./client";

const MARKET_TRANSACTIONS_QUERY_WITH_USER = `
  query MarketTransactions($key: String!, $cid: Int!, $start: Int!, $end: Int!, $userAddress: [String!]!) {
    transactions(
      first: 1000
      orderBy: Timestamp
      orderDirection: Asc
      where: {
        chainId_in: [$cid]
        marketUniqueKey_in: [$key]
        timestamp_gte: $start
        timestamp_lte: $end
        type_in: [MarketBorrow, MarketRepay]
        userAddress_in: $userAddress
      }
    ) {
      items {
        hash
        timestamp
        type
        user {
          address
        }
        data {
          __typename
          ... on MarketTransferTransactionData {
            assets
            assetsUsd
            shares
          }
        }
      }
    }
  }
`;

const MARKET_TRANSACTIONS_QUERY = `
  query MarketTransactions($key: String!, $cid: Int!, $start: Int!, $end: Int!) {
    transactions(
      first: 1000
      orderBy: Timestamp
      orderDirection: Asc
      where: {
        chainId_in: [$cid]
        marketUniqueKey_in: [$key]
        timestamp_gte: $start
        timestamp_lte: $end
        type_in: [MarketBorrow, MarketRepay]
      }
    ) {
      items {
        hash
        timestamp
        type
        user {
          address
        }
        data {
          __typename
          ... on MarketTransferTransactionData {
            assets
            assetsUsd
            shares
          }
        }
      }
    }
  }
`;

export type TransactionType = "MarketBorrow" | "MarketRepay";

export type MarketTransaction = {
  hash: string;
  timestamp: number | string;
  type: TransactionType;
  user: {
    address: string;
  };
  data: {
    __typename: string;
    assets?: string | null;
    assetsUsd?: number | null;
    shares?: string | null;
  };
};

type MarketTransactionsResponse = {
  transactions: {
    items: MarketTransaction[];
  };
};

export async function getMarketTransactions(
  marketKey: string,
  chainId: number,
  startTimestamp: number,
  endTimestamp: number,
  userAddress?: string
): Promise<MarketTransaction[]> {
  const baseVariables = {
    key: marketKey,
    cid: chainId,
    start: startTimestamp,
    end: endTimestamp,
  };

  const queryString = userAddress
    ? MARKET_TRANSACTIONS_QUERY_WITH_USER
    : MARKET_TRANSACTIONS_QUERY;

  const variables = userAddress
    ? { ...baseVariables, userAddress: [userAddress] }
    : baseVariables;

  const data = await query<MarketTransactionsResponse>(queryString, variables);

  return data.transactions.items;
}

export async function getBorrowerTransactions(
  borrowerAddress: string,
  marketKey: string,
  chainId: number,
  startTimestamp?: number,
  endTimestamp?: number
): Promise<MarketTransaction[]> {
  const now = Math.floor(Date.now() / 1000);
  const start = startTimestamp ?? now - 30 * 24 * 60 * 60;
  const end = endTimestamp ?? now;

  return getMarketTransactions(marketKey, chainId, start, end, borrowerAddress);
}

export function getFirstBorrowTimestamp(transactions: MarketTransaction[]): number | null {
  const borrowTransactions = transactions.filter((tx) => tx.type === "MarketBorrow");

  if (borrowTransactions.length === 0) {
    return null;
  }

  return Math.min(...borrowTransactions.map((tx) => Number(tx.timestamp)));
}
