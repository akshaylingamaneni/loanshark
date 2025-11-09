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
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { IconArrowUpRight, IconReportMoney, IconUsersGroup } from "@tabler/icons-react"
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

function formatCurrency(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`
  return `$${value.toFixed(2)}`
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

export default async function BreakdownPage() {
  const [markets, summary] = await Promise.all([
    getMarkets([137]),
    getDailyReimbursementSummary(),
  ])

  const marketsByKey = new Map(markets.map((market) => [market.uniqueKey, market]))
  const rows = summary?.markets ?? []
  const totalActual = summary?.totalActualUsd ?? 0
  const totalCapped = summary?.totalCappedUsd ?? 0
  const totalReimbursement = summary?.totalReimbursementUsd ?? 0
  const borrowerCount = summary?.borrowerCount ?? 0
  const borrowersAboveCap = summary?.borrowersAboveCap ?? 0
  const snapshotDay = summary?.day ? summary.day.toISOString().slice(0, 10) : null

  return (
    <SidebarProvider style={sidebarStyle}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader
          title="Reimbursement Breakdown"
          actions={
            snapshotDay ? <Badge variant="outline">{snapshotDay}</Badge> : undefined
          }
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="grid gap-4 px-4 lg:px-6 @lg/main:grid-cols-4">
                <Card className="border-dashed">
                  <CardHeader>
                    <CardDescription>Total reimbursements</CardDescription>
                    <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                      <IconReportMoney className="size-5 text-sky-500" />
                      {formatCurrency(totalReimbursement)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Actual - capped interest for the day
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardHeader>
                    <CardDescription>Actual interest</CardDescription>
                    <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                      <IconArrowUpRight className="size-5 text-emerald-500" />
                      {formatCurrency(totalActual)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    vs capped {formatCurrency(totalCapped)}
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardHeader>
                    <CardDescription>Borrowers impacted</CardDescription>
                    <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                      <IconUsersGroup className="size-5 text-indigo-500" />
                      {borrowersAboveCap}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    out of {borrowerCount} borrowers tracked
                  </CardContent>
                </Card>
              </div>
              <div className="px-4 lg:px-6">
                <Card>
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>Market breakdown</CardTitle>
                      <CardDescription>
                        Contribution to reimbursements by market for the latest completed day.
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/dashboard/alerts">View alerts</Link>
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    {rows.length === 0 ? (
                      <div className="p-10 text-center text-sm text-muted-foreground">
                        No reimbursement runs have been recorded yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-muted/60">
                            <TableRow>
                              <TableHead>Market</TableHead>
                              <TableHead>Borrowers</TableHead>
                              <TableHead>Above cap</TableHead>
                              <TableHead className="text-right">Actual</TableHead>
                              <TableHead className="text-right">Capped</TableHead>
                              <TableHead className="text-right">Reimbursement</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rows.map((row) => {
                              const market = marketsByKey.get(row.marketKey)
                              const label = market
                                ? `${market.collateralAsset.symbol}/${market.loanAsset.symbol}`
                                : row.marketKey.slice(0, 8)
                              return (
                                <TableRow key={row.marketKey}>
                                  <TableCell>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{label}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {row.marketKey.slice(0, 10)}…
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>{row.borrowerCount}</TableCell>
                                  <TableCell>
                                    {row.borrowersAboveCap} (
                                    {row.borrowerCount > 0
                                      ? formatPercent(row.borrowersAboveCap / row.borrowerCount)
                                      : "0.00%"}
                                    )
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(row.actualInterestUsd)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(row.cappedInterestUsd)}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {formatCurrency(row.reimbursementUsd)}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
