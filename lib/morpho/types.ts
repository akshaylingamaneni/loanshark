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
};

export type BorrowerData = {
  address: string;
  marketKey: string;
  borrowShares: string;
  borrowAssets: string;
  borrowAssetsUsd: number | null;
  borrowApy: number;
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
  };
  collateralAsset: {
    symbol: string;
  };
  lltv: string;
  state: {
    supplyAssetsUsd: number;
    borrowAssetsUsd: number;
    utilization: number;
    netSupplyApy: number;
    netBorrowApy: number;
  };
};

