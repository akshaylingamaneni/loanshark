import { query } from "./client";

const HISTORICAL_BORROW_APY_QUERY = `
  query HistoricalBorrowApy($key: String!, $cid: Int!, $start: Int!, $end: Int!) {
    marketByUniqueKey(uniqueKey: $key, chainId: $cid) {
      uniqueKey
      historicalState {
        borrowApy(options: { startTimestamp: $start, endTimestamp: $end, interval: HOUR }) {
          x
          y
        }
        netBorrowApy(options: { startTimestamp: $start, endTimestamp: $end, interval: HOUR }) {
          x
          y
        }
      }
    }
  }
`;

export type HistoricalApyPoint = {
  x: number;
  y: number;
};

type HistoricalBorrowApyResponse = {
  marketByUniqueKey: {
    uniqueKey: string;
    historicalState: {
      borrowApy: HistoricalApyPoint[];
      netBorrowApy?: HistoricalApyPoint[];
    };
  } | null;
};

export async function getHistoricalNetBorrowApy(
  marketKey: string,
  chainId: number,
  startTimestamp: number,
  endTimestamp: number
): Promise<HistoricalApyPoint[]> {
  const data = await query<HistoricalBorrowApyResponse>(HISTORICAL_BORROW_APY_QUERY, {
    key: marketKey,
    cid: chainId,
    start: startTimestamp,
    end: endTimestamp,
  });

  if (!data.marketByUniqueKey) {
    return [];
  }

  const { borrowApy = [], netBorrowApy = [] } = data.marketByUniqueKey.historicalState;
  return netBorrowApy.length > 0 ? netBorrowApy : borrowApy;
}

export function calculateAverageApy(points: HistoricalApyPoint[]): number {
  if (points.length === 0) return 0;

  const sum = points.reduce((acc, point) => acc + point.y, 0);
  return sum / points.length;
}

export function getDailyAverageApy(
  points: HistoricalApyPoint[],
  targetDate: Date
): number {
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const startTimestamp = Math.floor(startOfDay.getTime() / 1000);
  const endTimestamp = Math.floor(endOfDay.getTime() / 1000);

  const dayPoints = points.filter(
    (point) => point.x >= startTimestamp && point.x <= endTimestamp
  );

  if (dayPoints.length === 0) {
    return 0;
  }

  return calculateAverageApy(dayPoints);
}
