<!-- 530682e2-0966-4443-8834-09deecc9e579 90fe88f3-2779-4ac5-99f5-76a82a2f324b -->
# APR Cap and Reimbursement Service Implementation

## Current State Analysis

**What exists:**

- Basic dashboard showing markets and borrowers
- Data fetching from Morpho GraphQL API
- Database setup (Drizzle ORM with PostgreSQL)
- Basic UI components (markets table, borrowers table)

**What's missing:**

- APR cap configuration and storage
- Interest accrual tracking
- Daily reimbursement calculations
- Database schema for positions, interest history, reimbursements
- Backend service/cron for daily processing
- Dashboard metrics (borrowers under/above cap, daily reimbursements, alerts)
- API endpoints for dashboard data
- Tests for core logic

## Implementation Plan

### 1. Database Schema (`lib/db/schema.ts`)

Create tables for:

- `apr_caps` - APR cap configuration per market (marketKey, capRate, createdAt, updatedAt)
- `loan_positions` - Snapshot of borrower positions (address, marketKey, borrowAssets, borrowAssetsUsd, borrowApy, timestamp)
- `interest_history` - Daily interest accruals (positionId, interestAmount, interestAmountUsd, actualApy, cappedApy, timestamp)
- `reimbursements` - Reimbursement records (positionId, reimbursementAmount, reimbursementAmountUsd, interestAboveCap, date, status)

### 2. APR Cap Management (`lib/apr/caps.ts`)

- Functions to get/set APR caps per market
- Default caps for the 3 specified markets from problem.md
- Validation logic

### 3. Interest Calculation Service (`lib/apr/interest.ts`)

- Calculate daily interest accrual: `interest = borrowAssets * (borrowApy / 365)`
- Apply APR cap: `cappedInterest = borrowAssets * (min(borrowApy, capRate) / 365)`
- Calculate reimbursement: `reimbursement = interest - cappedInterest`
- Handle edge cases (zero positions, missing caps)

### 4. Daily Processing Script (`scripts/process-daily-reimbursements.ts`)

- Fetch all markets and borrowers from Morpho API
- For each borrower position:
- Calculate interest accrual for the day
- Apply APR cap
- Calculate reimbursement amount
- Store loan position snapshot
- Store interest history entry
- Create reimbursement record
- Run as cron job or scheduled task

### 5. API Endpoints (`app/api/`)

- `GET /api/apr-caps` - Get APR caps for all markets
- `PUT /api/apr-caps` - Update APR cap for a market
- `GET /api/reimbursements` - Get reimbursement data (with filters: date, market, borrower)
- `GET /api/dashboard-metrics` - Get aggregated metrics for dashboard

### 6. Dashboard Metrics Component (`components/dashboard-metrics.tsx`)

Display:

- Total active borrowers (count)
- Borrowers under capped APR (count and %)
- Borrowers above capped APR (count and %)
- Daily reimbursed amount in USD (today, this week, this month)
- Breakdown by markets (table/cards)
- Alert badges for:
- Reimbursements exceed threshold (configurable, default $10K/day)
- Market floating rate > 2× cap

### 7. Update Dashboard Page (`app/dashboard/page.tsx`)

- Add dashboard metrics section at top
- Keep existing markets table below
- Add alerts section

### 8. Tests (`lib/apr/__tests__/` or `scripts/test-reimbursement-logic.ts`)

- Test interest calculation with various APY and cap scenarios
- Test reimbursement calculation (above cap, at cap, below cap)
- Test edge cases (zero borrow, missing cap, negative interest)
- Verify daily aggregation logic

## Key Files to Create/Modify

**New files:**

- `lib/db/schema.ts` - Database schema
- `lib/apr/caps.ts` - APR cap management
- `lib/apr/interest.ts` - Interest calculation logic
- `lib/apr/types.ts` - Type definitions for APR service
- `scripts/process-daily-reimbursements.ts` - Daily processing script
- `scripts/test-reimbursement-logic.ts` - Test script
- `app/api/apr-caps/route.ts` - APR caps API
- `app/api/reimbursements/route.ts` - Reimbursements API
- `app/api/dashboard-metrics/route.ts` - Dashboard metrics API
- `components/dashboard-metrics.tsx` - Metrics display component

**Modify files:**

- `app/dashboard/page.tsx` - Add metrics and alerts
- `lib/morpho/types.ts` - Add types if needed

## Implementation Order

1. **Enhanced Morpho API queries** - Add queries for historical APY and borrower transactions
2. Database schema and migrations - Define data structures for tracking positions and interest
3. APR cap management functions - Get/set caps per market
4. Interest calculation service - Core logic for calculating interest and reimbursements
5. Daily processing script - Script to fetch positions, calculate interest, store data
6. API endpoints - Expose data for dashboard
7. Dashboard metrics component - Display metrics and alerts
8. Tests - Verify calculation logic
9. Integration and polish

### To-dos

- [ ] Create database schema for apr_caps, loan_positions, interest_history, and reimbursements tables
- [ ] Implement APR cap management functions (get/set caps per market)
- [ ] Build interest calculation service with APR cap application and reimbursement logic
- [ ] Create daily processing script to fetch positions, calculate interest, and store reimbursements
- [ ] Build API endpoints for apr-caps, reimbursements, and dashboard-metrics
- [ ] Create dashboard metrics component showing borrowers under/above cap, daily reimbursements, and alerts
- [ ] Integrate metrics component and alerts into main dashboard page
- [ ] Write tests for interest calculation and reimbursement logic