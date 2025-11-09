import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { borrowerDailyAccruals } from "@/lib/db/schema";

export type MarketReimbursementBreakdown = {
  marketKey: string;
  reimbursementUsd: number;
  actualInterestUsd: number;
  cappedInterestUsd: number;
  borrowerCount: number;
  borrowersAboveCap: number;
};

export type ReimbursementSummary = {
  day: Date | null;
  totalActualUsd: number;
  totalCappedUsd: number;
  totalReimbursementUsd: number;
  borrowerCount: number;
  borrowersAboveCap: number;
  markets: MarketReimbursementBreakdown[];
};

async function getLatestDay(): Promise<Date | null> {
  const latest = await db
    .select({ day: borrowerDailyAccruals.day })
    .from(borrowerDailyAccruals)
    .orderBy(desc(borrowerDailyAccruals.day))
    .limit(1);

  return latest[0]?.day ?? null;
}

export async function getDailyReimbursementSummary(targetDay?: Date): Promise<ReimbursementSummary> {
  const day = targetDay ?? (await getLatestDay());

  if (!day) {
    return {
      day: null,
      totalActualUsd: 0,
      totalCappedUsd: 0,
      totalReimbursementUsd: 0,
      borrowerCount: 0,
      borrowersAboveCap: 0,
      markets: [],
    };
  }

  const rows = await db
    .select({
      marketKey: borrowerDailyAccruals.marketKey,
      reimbursementUsd: sql<number>`COALESCE(sum(${borrowerDailyAccruals.reimbursementUsd}), 0)`,
      actualInterestUsd: sql<number>`COALESCE(sum(${borrowerDailyAccruals.actualInterestUsd}), 0)`,
      cappedInterestUsd: sql<number>`COALESCE(sum(${borrowerDailyAccruals.cappedInterestUsd}), 0)`,
      borrowerCount: sql<number>`count(*)`,
      borrowersAboveCap: sql<number>`count(*) FILTER (WHERE ${borrowerDailyAccruals.reimbursementUsd} > 0)`,
    })
    .from(borrowerDailyAccruals)
    .where(eq(borrowerDailyAccruals.day, day))
    .groupBy(borrowerDailyAccruals.marketKey);

  const markets = rows.map<MarketReimbursementBreakdown>((row) => ({
    marketKey: row.marketKey,
    reimbursementUsd: Number(row.reimbursementUsd ?? 0),
    actualInterestUsd: Number(row.actualInterestUsd ?? 0),
    cappedInterestUsd: Number(row.cappedInterestUsd ?? 0),
    borrowerCount: Number(row.borrowerCount ?? 0),
    borrowersAboveCap: Number(row.borrowersAboveCap ?? 0),
  }));

  const totals = markets.reduce(
    (acc, row) => {
      acc.totalActualUsd += row.actualInterestUsd;
      acc.totalCappedUsd += row.cappedInterestUsd;
      acc.totalReimbursementUsd += row.reimbursementUsd;
      acc.borrowerCount += row.borrowerCount;
      acc.borrowersAboveCap += row.borrowersAboveCap;
      return acc;
    },
    {
      totalActualUsd: 0,
      totalCappedUsd: 0,
      totalReimbursementUsd: 0,
      borrowerCount: 0,
      borrowersAboveCap: 0,
    }
  );

  return {
    day,
    markets,
    ...totals,
  };
}
