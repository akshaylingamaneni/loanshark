CREATE TABLE "borrower_daily_accruals" (
	"id" serial PRIMARY KEY NOT NULL,
	"borrower_address" text NOT NULL,
	"market_key" text NOT NULL,
	"day" date NOT NULL,
	"cap_apr_bps" integer NOT NULL,
	"starting_principal_usd" numeric(30, 4) NOT NULL,
	"ending_principal_usd" numeric(30, 4) NOT NULL,
	"actual_interest_usd" numeric(30, 6) NOT NULL,
	"capped_interest_usd" numeric(30, 6) NOT NULL,
	"reimbursement_usd" numeric(30, 6) NOT NULL,
	"segments" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "borrower_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"borrower_address" text NOT NULL,
	"market_key" text NOT NULL,
	"borrow_assets" numeric(40, 12) NOT NULL,
	"borrow_assets_usd" numeric(30, 4),
	"loan_asset_price_usd" numeric(30, 8),
	"borrow_shares" numeric(40, 0) NOT NULL,
	"net_borrow_apy_snapshot" numeric(20, 10),
	"last_snapshot_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_rate_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"market_key" text NOT NULL,
	"timestamp" timestamp NOT NULL,
	"net_borrow_apy" numeric(20, 10) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "markets" (
	"unique_key" text PRIMARY KEY NOT NULL,
	"chain_id" integer NOT NULL,
	"collateral_symbol" text NOT NULL,
	"collateral_address" text NOT NULL,
	"collateral_decimals" integer NOT NULL,
	"loan_symbol" text NOT NULL,
	"loan_address" text NOT NULL,
	"loan_decimals" integer NOT NULL,
	"lltv" text NOT NULL,
	"apr_cap_bps" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reimbursements" (
	"id" serial PRIMARY KEY NOT NULL,
	"accrual_id" integer NOT NULL,
	"borrower_address" text NOT NULL,
	"market_key" text NOT NULL,
	"day" date NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"amount_usd" numeric(30, 6) DEFAULT '0' NOT NULL,
	"tx_hash" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "borrower_daily_accruals" ADD CONSTRAINT "borrower_daily_accruals_market_key_markets_unique_key_fk" FOREIGN KEY ("market_key") REFERENCES "public"."markets"("unique_key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "borrower_positions" ADD CONSTRAINT "borrower_positions_market_key_markets_unique_key_fk" FOREIGN KEY ("market_key") REFERENCES "public"."markets"("unique_key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_rate_snapshots" ADD CONSTRAINT "market_rate_snapshots_market_key_markets_unique_key_fk" FOREIGN KEY ("market_key") REFERENCES "public"."markets"("unique_key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reimbursements" ADD CONSTRAINT "reimbursements_accrual_id_borrower_daily_accruals_id_fk" FOREIGN KEY ("accrual_id") REFERENCES "public"."borrower_daily_accruals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "borrower_daily_accruals_borrower_day_idx" ON "borrower_daily_accruals" USING btree ("borrower_address","market_key","day");--> statement-breakpoint
CREATE UNIQUE INDEX "borrower_positions_borrower_market_idx" ON "borrower_positions" USING btree ("borrower_address","market_key");--> statement-breakpoint
CREATE UNIQUE INDEX "market_rate_snapshots_market_time_idx" ON "market_rate_snapshots" USING btree ("market_key","timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "reimbursements_accrual_id_idx" ON "reimbursements" USING btree ("accrual_id");
