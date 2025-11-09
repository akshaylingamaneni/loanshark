import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  borrowerDailyAccruals,
  borrowerPositions,
  marketRateSnapshots,
  markets as marketsTable,
  reimbursements,
} from "@/lib/db/schema";
import { getBorrowersForMarket } from "@/lib/morpho/borrowers";
import { getHistoricalNetBorrowApy } from "@/lib/morpho/market-history";
import { getMarkets } from "@/lib/morpho/markets";
import { getBorrowerTransactions } from "@/lib/morpho/borrower-transactions";
import { calculateDailyReimbursement } from "@/lib/reimbursements/calculator";
import { MARKET_CAPS } from "@/lib/reimbursements/market-caps";
import type { PrincipalEvent, RatePoint } from "@/lib/reimbursements/types";

const SECONDS_PER_DAY = 86_400;

function parseDateArg(input?: string): Date {
  if (!input) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date argument provided: ${input}`);
  }
  parsed.setUTCHours(0, 0, 0, 0);
  return parsed;
}

function getUnix(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

function fromUnix(seconds: number): Date {
  return new Date(seconds * 1000);
}

function normalizeAssetAmount(raw: string | number | null | undefined, decimals: number): number {
  if (!raw) return 0;
  const value = typeof raw === "string" ? Number(raw) : raw;
  if (!Number.isFinite(value)) return 0;
  return value / 10 ** decimals;
}

function numericString(value: number, decimals: number = 8): string {
  return Number.isFinite(value) ? value.toFixed(decimals) : "0";
}

async function upsertMarketMetadata(market: Awaited<ReturnType<typeof getMarkets>>[number], capApr: number) {
  await db
    .insert(marketsTable)
    .values({
      uniqueKey: market.uniqueKey,
      chainId: 137,
      collateralSymbol: market.collateralAsset.symbol,
      collateralAddress: market.collateralAsset.address,
      collateralDecimals: market.collateralAsset.decimals,
      loanSymbol: market.loanAsset.symbol,
      loanAddress: market.loanAsset.address,
      loanDecimals: market.loanAsset.decimals,
      lltv: market.lltv,
      aprCapBps: Math.round(capApr * 10_000),
    })
    .onConflictDoUpdate({
      target: marketsTable.uniqueKey,
      set: {
        chainId: 137,
        collateralSymbol: market.collateralAsset.symbol,
        collateralAddress: market.collateralAsset.address,
        collateralDecimals: market.collateralAsset.decimals,
        loanSymbol: market.loanAsset.symbol,
        loanAddress: market.loanAsset.address,
        loanDecimals: market.loanAsset.decimals,
        lltv: market.lltv,
        aprCapBps: Math.round(capApr * 10_000),
        updatedAt: new Date(),
      },
    });
}

async function persistSnapshots(marketKey: string, points: RatePoint[]) {
  if (points.length === 0) return;
  await db
    .insert(marketRateSnapshots)
    .values(
      points.map((point) => ({
        marketKey,
        timestamp: fromUnix(point.timestamp),
        netBorrowApy: numericString(point.apy, 10),
      }))
    )
    .onConflictDoNothing();
}

async function getStoredPosition(borrowerAddress: string, marketKey: string) {
  return db.query.borrowerPositions.findFirst({
    where: and(eq(borrowerPositions.borrowerAddress, borrowerAddress), eq(borrowerPositions.marketKey, marketKey)),
  });
}

function resolvePriceUsd(
  borrower: Awaited<ReturnType<typeof getBorrowersForMarket>>[number],
  market: Awaited<ReturnType<typeof getMarkets>>[number],
  position?: Awaited<ReturnType<typeof getStoredPosition>>
): number | null {
  if (position?.loanAssetPriceUsd) {
    return Number(position.loanAssetPriceUsd);
  }

  if (borrower.borrowAssetsUsd && borrower.borrowAssets) {
    const normalized = normalizeAssetAmount(borrower.borrowAssets, market.loanAsset.decimals);
    if (normalized > 0) {
      return borrower.borrowAssetsUsd / normalized;
    }
  }

  return null;
}

function toEventsUsd(
  transactions: Awaited<ReturnType<typeof getBorrowerTransactions>>,
  decimals: number,
  priceUsd: number
): PrincipalEvent[] {
  return transactions.reduce<PrincipalEvent[]>((events, tx) => {
    const usdAmount =
      tx.data.assetsUsd ?? normalizeAssetAmount(tx.data.assets ?? null, decimals) * priceUsd;

    if (!usdAmount || usdAmount <= 0) {
      return events;
    }

    events.push({
      timestamp: Number(tx.timestamp),
      delta: tx.type === "MarketBorrow" ? usdAmount : -usdAmount,
      hash: tx.hash,
      type: tx.type,
    });

    return events;
  }, []);
}

async function processBorrower(params: {
  borrower: Awaited<ReturnType<typeof getBorrowersForMarket>>[number];
  market: Awaited<ReturnType<typeof getMarkets>>[number];
  capApr: number;
  chainId: number;
  ratePoints: RatePoint[];
  dayStart: number;
  dayEnd: number;
}) {
  const { borrower, market, capApr, chainId, ratePoints, dayStart, dayEnd } = params;

  const position = await getStoredPosition(borrower.address, market.uniqueKey);
  const priceUsd = resolvePriceUsd(borrower, market, position);

  if (!priceUsd) {
    console.warn(`Skipping borrower ${borrower.address} on ${market.uniqueKey} - missing USD price.`);
    return;
  }

  const fallbackUsd =
    borrower.borrowAssetsUsd ??
    (borrower.borrowAssets
      ? normalizeAssetAmount(borrower.borrowAssets, market.loanAsset.decimals) * priceUsd
      : null);

  const startingPrincipalUsd =
    position?.borrowAssetsUsd !== null && position?.borrowAssetsUsd !== undefined
      ? Number(position.borrowAssetsUsd)
      : fallbackUsd;

  if (!startingPrincipalUsd || startingPrincipalUsd <= 0) {
    console.warn(`Skipping borrower ${borrower.address} - no principal to accrue.`);
    return;
  }
  console.log(
    market.uniqueKey,
    'avgAPY',
    ratePoints.reduce((a, p) => a + Number(p.apy || 0), 0) / ratePoints.length,
    "cap",
    capApr
  );
  const transactions = await getBorrowerTransactions(
    borrower.address,
    borrower.marketKey,
    chainId,
    dayStart,
    dayEnd
  );

  const events = toEventsUsd(transactions, market.loanAsset.decimals, priceUsd);

  const effectiveRatePoints =
    ratePoints.length > 0
      ? ratePoints
      : [
          {
            timestamp: dayStart,
            apy:
              market.state?.netBorrowApy ??
              market.state?.borrowApy ??
              borrower.netBorrowApy ??
              0,
          },
        ];

  const result = calculateDailyReimbursement({
    dayStart,
    dayEnd,
    startingPrincipal: startingPrincipalUsd,
    capApr,
    ratePoints: effectiveRatePoints,
    events,
  });

  const dayDate = fromUnix(dayStart);

  const [accrual] = await db
    .insert(borrowerDailyAccruals)
    .values({
      borrowerAddress: borrower.address,
      marketKey: market.uniqueKey,
      day: dayDate,
      capAprBps: Math.round(capApr * 10_000),
      startingPrincipalUsd: numericString(startingPrincipalUsd, 6),
      endingPrincipalUsd: numericString(result.endingPrincipal, 6),
      actualInterestUsd: numericString(result.actualInterest, 6),
      cappedInterestUsd: numericString(result.cappedInterest, 6),
      reimbursementUsd: numericString(result.reimbursement, 6),
      segments: result.segments,
    })
    .onConflictDoUpdate({
      target: [
        borrowerDailyAccruals.borrowerAddress,
        borrowerDailyAccruals.marketKey,
        borrowerDailyAccruals.day,
      ],
      set: {
        capAprBps: Math.round(capApr * 10_000),
        startingPrincipalUsd: numericString(startingPrincipalUsd, 6),
        endingPrincipalUsd: numericString(result.endingPrincipal, 6),
        actualInterestUsd: numericString(result.actualInterest, 6),
        cappedInterestUsd: numericString(result.cappedInterest, 6),
        reimbursementUsd: numericString(result.reimbursement, 6),
        segments: result.segments,
        createdAt: new Date(),
      },
    })
    .returning();

  if (result.reimbursement > 0 && accrual) {
    await db
      .insert(reimbursements)
      .values({
        accrualId: accrual.id,
        borrowerAddress: borrower.address,
        marketKey: market.uniqueKey,
        day: dayDate,
        status: "pending",
        amountUsd: numericString(result.reimbursement, 6),
      })
      .onConflictDoUpdate({
        target: reimbursements.accrualId,
        set: {
          amountUsd: numericString(result.reimbursement, 6),
          status: "pending",
        },
      });
  }

  await db
    .insert(borrowerPositions)
    .values({
      borrowerAddress: borrower.address,
      marketKey: market.uniqueKey,
      borrowAssets: numericString(result.endingPrincipal / priceUsd, 12),
      borrowAssetsUsd: numericString(result.endingPrincipal, 6),
      loanAssetPriceUsd: numericString(priceUsd, 8),
      borrowShares: borrower.borrowShares,
      netBorrowApySnapshot: numericString(borrower.netBorrowApy, 8),
      lastSnapshotAt: fromUnix(dayEnd),
    })
    .onConflictDoUpdate({
      target: [
        borrowerPositions.borrowerAddress,
        borrowerPositions.marketKey,
      ],
      set: {
        borrowAssets: numericString(result.endingPrincipal / priceUsd, 12),
        borrowAssetsUsd: numericString(result.endingPrincipal, 6),
        loanAssetPriceUsd: numericString(priceUsd, 8),
        borrowShares: borrower.borrowShares,
        netBorrowApySnapshot: numericString(borrower.netBorrowApy, 8),
        lastSnapshotAt: fromUnix(dayEnd),
        updatedAt: new Date(),
      },
    });

  console.log(
    `Borrower ${borrower.address} on ${market.collateralAsset.symbol}/${market.loanAsset.symbol}: reimbursement=$${result.reimbursement.toFixed(
      4
    )}`
  );
}

async function main() {
  const dateArg = process.argv.find((arg) => arg.startsWith("--date="))?.split("=")[1];
  const date = parseDateArg(dateArg);
  const dayStart = getUnix(date);
  const dayEnd = dayStart + SECONDS_PER_DAY;

  console.log(`Running reimbursement calculation for ${date.toISOString().slice(0, 10)}`);

  const markets = await getMarkets([137]);
  const targets = markets.filter((market) => MARKET_CAPS[market.uniqueKey]);

  for (const market of targets) {
    const cap = MARKET_CAPS[market.uniqueKey]!;
    console.log(`Processing market ${cap.label} (${market.uniqueKey.slice(0, 10)}...) with cap ${(
      cap.capApr * 100
    ).toFixed(2)}%`);

    await upsertMarketMetadata(market, cap.capApr);

    const apyPointsRaw = await getHistoricalNetBorrowApy(market.uniqueKey, cap.chainId, dayStart, dayEnd);
    const ratePoints: RatePoint[] = apyPointsRaw.map((point) => ({
      timestamp: Number(point.x),
      apy: Number(point.y ?? 0),
    }));

    if (ratePoints.length === 0) {
      const fallbackApy =
        market.state?.netBorrowApy ??
        market.state?.borrowApy ??
        0;
      ratePoints.push({
        timestamp: dayStart,
        apy: fallbackApy,
      });
      console.warn(
        `No historical APY data for market ${market.uniqueKey}. Falling back to snapshot ${(
          fallbackApy * 100
        ).toFixed(4)}%`
      );
    }
    await persistSnapshots(market.uniqueKey, ratePoints);

    const borrowers = await getBorrowersForMarket(market, cap.chainId);
    console.log(`Found ${borrowers.length} borrowers for market ${market.uniqueKey.slice(0, 8)}...`);

    for (const borrower of borrowers) {
      try {
        await processBorrower({
          borrower,
          market,
          capApr: cap.capApr,
          chainId: cap.chainId,
          ratePoints,
          dayStart,
          dayEnd,
        });
      } catch (error) {
        console.error(`Failed to process borrower ${borrower.address}:`, error);
      }
    }
  }

  console.log("Reimbursement calculation completed.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error running reimbursements:", error);
  process.exit(1);
});
