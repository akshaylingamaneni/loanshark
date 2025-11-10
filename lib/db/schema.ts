import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const markets = pgTable("markets", {
  uniqueKey: text("unique_key").primaryKey(),
  chainId: integer("chain_id").notNull(),
  collateralSymbol: text("collateral_symbol").notNull(),
  collateralAddress: text("collateral_address").notNull(),
  collateralDecimals: integer("collateral_decimals").notNull(),
  loanSymbol: text("loan_symbol").notNull(),
  loanAddress: text("loan_address").notNull(),
  loanDecimals: integer("loan_decimals").notNull(),
  lltv: text("lltv").notNull(),
  aprCapBps: integer("apr_cap_bps").notNull().default(0),
  isTracked: boolean("is_tracked").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const marketRateSnapshots = pgTable(
  "market_rate_snapshots",
  {
    id: serial("id").primaryKey(),
    marketKey: text("market_key")
      .notNull()
      .references(() => markets.uniqueKey, { onDelete: "cascade" }),
    timestamp: timestamp("timestamp").notNull(),
    netBorrowApy: numeric("net_borrow_apy", { precision: 20, scale: 10 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    marketTimeIdx: uniqueIndex("market_rate_snapshots_market_time_idx").on(
      table.marketKey,
      table.timestamp
    ),
  })
);

export const borrowerPositions = pgTable(
  "borrower_positions",
  {
    id: serial("id").primaryKey(),
    borrowerAddress: text("borrower_address").notNull(),
    marketKey: text("market_key")
      .notNull()
      .references(() => markets.uniqueKey, { onDelete: "cascade" }),
    borrowAssets: numeric("borrow_assets", { precision: 40, scale: 12 }).notNull(),
    borrowAssetsUsd: numeric("borrow_assets_usd", { precision: 30, scale: 4 }),
    loanAssetPriceUsd: numeric("loan_asset_price_usd", { precision: 30, scale: 8 }),
    borrowShares: numeric("borrow_shares", { precision: 40, scale: 0 }).notNull(),
    netBorrowApySnapshot: numeric("net_borrow_apy_snapshot", { precision: 20, scale: 10 }),
    lastSnapshotAt: timestamp("last_snapshot_at"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    borrowerMarketIdx: uniqueIndex("borrower_positions_borrower_market_idx").on(
      table.borrowerAddress,
      table.marketKey
    ),
  })
);

export type SegmentDetail = {
  start: number;
  end: number;
  apy: number;
  capApr: number;
  deltaSeconds: number;
  principalBefore: number;
  principalAfter: number;
  interestAccrued: number;
  cappedInterestAccrued: number;
};

export const borrowerDailyAccruals = pgTable(
  "borrower_daily_accruals",
  {
    id: serial("id").primaryKey(),
    borrowerAddress: text("borrower_address").notNull(),
    marketKey: text("market_key")
      .notNull()
      .references(() => markets.uniqueKey, { onDelete: "cascade" }),
    day: date("day", { mode: "date" }).notNull(),
    capAprBps: integer("cap_apr_bps").notNull(),
    startingPrincipalUsd: numeric("starting_principal_usd", { precision: 30, scale: 4 }).notNull(),
    endingPrincipalUsd: numeric("ending_principal_usd", { precision: 30, scale: 4 }).notNull(),
    actualInterestUsd: numeric("actual_interest_usd", { precision: 30, scale: 6 }).notNull(),
    cappedInterestUsd: numeric("capped_interest_usd", { precision: 30, scale: 6 }).notNull(),
    reimbursementUsd: numeric("reimbursement_usd", { precision: 30, scale: 6 }).notNull(),
    segments: jsonb("segments").$type<SegmentDetail[] | null>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    borrowerDayIdx: uniqueIndex("borrower_daily_accruals_borrower_day_idx").on(
      table.borrowerAddress,
      table.marketKey,
      table.day
    ),
  })
);

export const reimbursements = pgTable(
  "reimbursements",
  {
    id: serial("id").primaryKey(),
    accrualId: integer("accrual_id")
      .notNull()
      .references(() => borrowerDailyAccruals.id, { onDelete: "cascade" }),
    borrowerAddress: text("borrower_address").notNull(),
    marketKey: text("market_key").notNull(),
    day: date("day", { mode: "date" }).notNull(),
    status: text("status").notNull().default("pending"),
    amountUsd: numeric("amount_usd", { precision: 30, scale: 6 }).notNull().default("0"),
    txHash: text("tx_hash"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    processedAt: timestamp("processed_at"),
  },
  (table) => ({
    accrualUniqueIdx: uniqueIndex("reimbursements_accrual_id_idx").on(table.accrualId),
  })
);

export const reimbursementStatus = {
  pending: "pending",
  queued: "queued",
  sent: "sent",
  failed: "failed",
} as const;
