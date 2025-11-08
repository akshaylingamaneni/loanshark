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
  } | null;
  collateralAsset: {
    symbol: string;
  } | null;
  lltv: string;
  state: {
    supplyAssetsUsd: number;
    borrowAssetsUsd: number;
    utilization: number;
    netSupplyApy: number;
    netBorrowApy: number;
  } | null;
};

