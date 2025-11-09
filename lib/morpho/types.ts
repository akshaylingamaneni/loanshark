export type MarketPosition = {
  user: {
    address: string;
  };
  state: {
    borrowShares: string;
    borrowAssets: string;
    borrowAssetsUsd: number | null;
  };
};

export type MarketState = {
  borrowApy: number;
  netBorrowApy: number;
};

export type BorrowerData = {
  address: string;
  marketKey: string;
  borrowShares: string;
  borrowAssets: string;
  borrowAssetsUsd: number | null;
  netBorrowApy: number;
  market: Market;
};

export type MarketConfig = {
  key: string;
  chainId: number;
  loanAsset: string;
  collateralAsset: string;
  lltv: string;
};

export type Market = {
  uniqueKey: string;
  loanAsset: {
    symbol: string;
    address: string;
    decimals: number;
    priceUsd?: number | null;
  };
  collateralAsset: {
    symbol: string;
    address: string;
    decimals: number;
  };
  lltv: string;
  state: {
    supplyAssetsUsd: number;
    borrowAssetsUsd: number;
    utilization: number;
    borrowApy: number;
    netSupplyApy: number;
    netBorrowApy: number;
  };
};

export type HistoricalApyPoint = {
  x: number;
  y: number;
};

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
