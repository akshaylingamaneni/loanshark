import Link from "next/link"
import type { CSSProperties } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IconAlertTriangle, IconGauge, IconReportMoney } from "@tabler/icons-react"
import { getMarkets } from "@/lib/morpho/markets"
import { getDailyReimbursementSummary } from "@/lib/reimbursements/metrics"

type SidebarStyle = CSSProperties & {
  "--sidebar-width": string
  "--header-height": string
}

const sidebarStyle: SidebarStyle = {
  "--sidebar-width": "calc(var(--spacing) * 72)",
  "--header-height": "calc(var(--spacing) * 12)",
}

const UTILIZATION_THRESHOLD = 0.85

function formatCurrency(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`
  return `$${value.toFixed(2)}`
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

type AlertItem = {
  id: string
  title: string
  value: string
  meta: string
  description: string
  href?: string
}

function AlertList({
  title,
  description,
  items,
  emptyState,
}: {
  title: string
  description: string
  items: AlertItem[]
  emptyState: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{description}</CardDescription>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/50 p-6 text-center text-sm text-muted-foreground">
            {emptyState}
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-2xl border p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{item.title}</div>
                <span className="text-sm font-semibold">{item.value}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{item.meta}</span>
                {item.href ? (
                  <Button variant="ghost" size="sm" className="px-2" asChild>
                    <Link href={item.href}>Details</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export default async function AlertsPage() {
  const [markets, reimbursementSummary] = await Promise.all([
    getMarkets([137]),
    getDailyReimbursementSummary(),
  ])

  const summaryMarkets = reimbursementSummary?.markets ?? []
  const marketsByKey = new Map(markets.map((market) => [market.uniqueKey, market]))

  const reimbursementAlerts = summaryMarkets
    .filter((entry) => entry.reimbursementUsd > 0)
    .sort((a, b) => b.reimbursementUsd - a.reimbursementUsd)

  const utilizationAlerts = markets
    .filter((market) => market.state.utilization >= UTILIZATION_THRESHOLD)
    .sort((a, b) => b.state.utilization - a.state.utilization)

  const alertCount = reimbursementAlerts.length + utilizationAlerts.length
  const latestRun = reimbursementSummary?.day
    ? reimbursementSummary.day.toISOString().slice(0, 10)
    : "Awaiting first run"

  const reimbursementItems: AlertItem[] = reimbursementAlerts.map((alert) => {
    const market = marketsByKey.get(alert.marketKey)
    const label = market
      ? `${market.collateralAsset.symbol}/${market.loanAsset.symbol}`
      : alert.marketKey.slice(0, 10)
    const borrowerMeta = `${alert.borrowersAboveCap}/${alert.borrowerCount} borrowers`

    return {
      id: alert.marketKey,
      title: label,
      value: formatCurrency(alert.reimbursementUsd),
      description: "Interest accrued above the configured cap",
      meta: borrowerMeta,
      href: "/dashboard/breakdown",
    }
  })

  const utilizationItems: AlertItem[] = utilizationAlerts.map((market) => ({
    id: market.uniqueKey,
    title: `${market.collateralAsset.symbol}/${market.loanAsset.symbol}`,
    value: formatPercent(market.state.utilization),
    description: `Borrow APY ${formatPercent(market.state.borrowApy)} · Net ${formatPercent(
      market.state.netBorrowApy,
    )}`,
    meta: `${formatCurrency(market.state.borrowAssetsUsd)} borrowed`,
    href: "/dashboard/borrowers",
  }))

  return (
    <SidebarProvider style={sidebarStyle}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader
          title="Alerts"
          actions={<Badge variant="outline">Last sync: {latestRun}</Badge>}
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="grid gap-4 px-4 lg:px-6 @lg/main:grid-cols-3">
                <Card className="border-dashed">
                  <CardHeader>
                    <CardDescription>Open alerts</CardDescription>
                    <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                      <IconAlertTriangle className="size-5 text-amber-500" />
                      {alertCount}
                    </CardTitle>
                  </CardHeader>
                  <CardFooter className="justify-between text-sm text-muted-foreground">
                    <span>{reimbursementAlerts.length} reimbursement · {utilizationAlerts.length} utilization</span>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/dashboard">Back to overview</Link>
                    </Button>
                  </CardFooter>
                </Card>
                <Card className="border-dashed">
                  <CardHeader>
                    <CardDescription>Reimbursement exposure</CardDescription>
                    <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                      <IconReportMoney className="size-5 text-sky-500" />
                      {formatCurrency(
                        reimbursementAlerts.reduce((sum, alert) => sum + alert.reimbursementUsd, 0),
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardFooter className="justify-between text-sm text-muted-foreground">
                    <span>{reimbursementItems.length} affected markets</span>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/dashboard/breakdown">View details</Link>
                    </Button>
                  </CardFooter>
                </Card>
                <Card className="border-dashed">
                  <CardHeader>
                    <CardDescription>Utilization pressure</CardDescription>
                    <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                      <IconGauge className="size-5 text-rose-500" />
                      {utilizationAlerts.length}
                    </CardTitle>
                  </CardHeader>
                  <CardFooter className="justify-between text-sm text-muted-foreground">
                    <span>≥ {formatPercent(UTILIZATION_THRESHOLD)}</span>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/dashboard/borrowers">Check borrowers</Link>
                    </Button>
                  </CardFooter>
                </Card>
              </div>
              <div className="grid gap-6 px-4 lg:px-6 lg:grid-cols-2">
                <AlertList
                  title="Reimbursement Alerts"
                  description="Markets with borrowers accruing above the configured APR caps."
                  items={reimbursementItems}
                  emptyState="No reimbursements exceeded the cap in the last run."
                />
                <AlertList
                  title="Utilization Alerts"
                  description="Markets nearing full utilization and likely to move rates."
                  items={utilizationItems}
                  emptyState="No markets crossed the utilization threshold."
                />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
