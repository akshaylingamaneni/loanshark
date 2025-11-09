import { IconArrowDownRight, IconTrendingUp } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Market } from "@/lib/morpho/types"
import type { ReimbursementSummary } from "@/lib/reimbursements/metrics"

function formatCurrency(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`
  return `$${value.toFixed(2)}`
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

function formatDate(date: Date | null): string {
  if (!date) return "No data";
  return date.toISOString().slice(0, 10);
}

export function SectionCards({
  markets,
  reimbursementSummary,
}: {
  markets: Market[]
  reimbursementSummary: ReimbursementSummary | null
}) {
  const totalSupply = markets.reduce((sum, m) => sum + m.state.supplyAssetsUsd, 0)
  const totalBorrow = markets.reduce((sum, m) => sum + m.state.borrowAssetsUsd, 0)
  const avgUtilization = markets.reduce((sum, m) => sum + m.state.utilization, 0) / markets.length
  const avgBorrowSnapshot = markets.reduce((sum, m) => sum + m.state.borrowApy, 0) / markets.length
  const totalReimbursement = reimbursementSummary?.totalReimbursementUsd ?? 0
  const borrowersAboveCap = reimbursementSummary?.borrowersAboveCap ?? 0
  const borrowerCount = reimbursementSummary?.borrowerCount ?? 0

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Supply</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(totalSupply)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              {markets.length} markets
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Across all Polygon markets
          </div>
          <div className="text-muted-foreground">
            Total assets supplied
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Borrow</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(totalBorrow)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {formatPercent(avgUtilization)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Average utilization {formatPercent(avgUtilization)}
          </div>
          <div className="text-muted-foreground">
            Total assets borrowed
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Markets</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {markets.length}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              Polygon
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Whitelisted markets with activity
          </div>
          <div className="text-muted-foreground">Chain ID 137</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Avg Borrow APY (Snapshot)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatPercent(avgBorrowSnapshot)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              Live rate
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Average across all markets
          </div>
          <div className="text-muted-foreground">Instantaneous borrow rate snapshot</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Daily Reimbursement</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(totalReimbursement)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconArrowDownRight />
              {borrowersAboveCap}/{borrowerCount || "0"} borrowers
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Snapshot for {formatDate(reimbursementSummary?.day ?? null)}
          </div>
          <div className="text-muted-foreground">
            Total USD reimbursed above cap
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
