# Loanshark

Loanshark is a project to track the various markets in the polygon ecosystem and calculate the daily reimbursements for each market based on the APR cap and the interest accrued.

## Getting Started 

First, run the development server:

```bash
pnpm install
pnpm dev
```

## Running the tests

```bash
pnpm test
```

## Running the tests with UI

```bash
pnpm test:ui
```

## How it works?

We use the Morpho GraphQL API to fetch the markets and borrowers. Once we have the markets and borrowers, we fetch the historical APY data for each market and store it in the database. We then calculate the daily reimbursements for each borrower based on the APR cap and the interest accrued. We store the reimbursements in the database and then we can use the data to display the reimbursements in the dashboard.

### How we calculate the daily reimbursements?

1. **Ingest hourly net borrow APY snapshots**  
   For every capped Morpho market we hit `historicalState.netBorrowApy` (hour granularity) for the target 24 h window and store the resulting curve in `market_rate_snapshots`. If Morpho doesn’t return a timeseries we fall back to the latest on-chain snapshot so the day is still priced. (was getting NaN errors when Morpho didn't return a timeseries)

2. **Rebuild each borrower’s principal path**  
   Starting from the latest stored position we replay that borrower’s Morpho `MarketBorrow`/`MarketRepay` transactions inside the same 24 h window. Each cashflow becomes an event `(timestamp, deltaPrincipal)` so we know when principal changes before/after compounding.

3. **Integrate floating vs capped rates**  
   `calculateDailyReimbursement` walks the day segment by segment. For every interval it:
   - Converts the sampled APY to a continuous per-second rate `r = ln(1 + apy) / SECONDS_PER_YEAR`.
   - Applies the principal growth `P * growthFromRate(r, deltaSeconds)` to get actual interest.
   - Repeats the same math with the cap APR to get what the borrower *should* have paid.

4. **Persist accruals & reimbursements**  
   The script stores the per-segment breakdown, daily totals, and `max(0, actual - capped)` reimbursement in Postgres (`borrower_daily_accruals`, `reimbursements`). These rows drive both the dashboard metrics and the eventual payout automation.


## Assumptions & Limitations

1. We are only reimbursements based on Morpho's MarketBorrow/MarketRepay transactions.
2. We are only pulling the top 1000 borrowers
3. APR caps are stored per market in Postgres (seeded from `DEFAULT_MARKET_CAPS`) and can be managed from the Markets admin UI.
4. We are using day and mid day snapshots to calculate the reimbursements.
5. A day's starting principal is taken form yesterday's stored position. If there is no stored row then we use the borrowAssetsUsd value from the borrower, or fallback to borrowAssets * priceUsd.
6. We are converting the APY to a continuous per-second rate using the formula `r = ln(1 + apy) / SECONDS_PER_YEAR` and reimbursement is calculated as `max(0, actual - capped)`.
