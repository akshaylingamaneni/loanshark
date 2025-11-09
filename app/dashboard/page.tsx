import Link from "next/link"
import type { CSSProperties } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { MarketsTable } from "@/components/markets-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { IconAlertTriangle, IconChartHistogram, IconUsersGroup } from "@tabler/icons-react"
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

export default async function Page() {
  const [markets, reimbursementSummary] = await Promise.all([
    getMarkets([137]),
    getDailyReimbursementSummary(),
  ]);

  const summaryMarkets = reimbursementSummary?.markets ?? []
  const reimbursementAlerts = summaryMarkets.filter((entry) => entry.reimbursementUsd > 0).length
  const utilizationAlerts = markets.filter((market) => market.state.utilization >= 0.85).length
  const activeAlerts = reimbursementAlerts + utilizationAlerts
  const reimbursementsTotal = reimbursementSummary?.totalReimbursementUsd ?? 0
  const borrowerCount = reimbursementSummary?.borrowerCount ?? 0
  const reimbursementDay = reimbursementSummary?.day
    ? reimbursementSummary.day.toISOString().slice(0, 10)
    : "No reimbursements yet"

  return (
    <SidebarProvider style={sidebarStyle}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards markets={markets} reimbursementSummary={reimbursementSummary} />
              <div className="grid gap-4 px-4 lg:px-6 @lg/main:grid-cols-3">
                <Card className="border-dashed">
                  <CardHeader>
                    <CardDescription>Active alerts</CardDescription>
                    <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                      <IconAlertTriangle className="size-5 text-amber-500" />
                      {activeAlerts}
                    </CardTitle>
                  </CardHeader>
                  <CardFooter className="justify-between text-sm text-muted-foreground">
                    <span>{utilizationAlerts} utilization · {reimbursementAlerts} reimbursement</span>
                    <Button variant="ghost" asChild>
                      <Link href="/dashboard/alerts">Review</Link>
                    </Button>
                  </CardFooter>
                </Card>
                <Card className="border-dashed">
                  <CardHeader>
                    <CardDescription>Daily reimbursements</CardDescription>
                    <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                      <IconChartHistogram className="size-5 text-sky-500" />
                      {formatCurrency(reimbursementsTotal)}
                    </CardTitle>
                  </CardHeader>
                  <CardFooter className="justify-between text-sm text-muted-foreground">
                    <span>{reimbursementDay}</span>
                    <Button variant="ghost" asChild>
                      <Link href="/dashboard/breakdown">See breakdown</Link>
                    </Button>
                  </CardFooter>
                </Card>
                <Card className="border-dashed">
                  <CardHeader>
                    <CardDescription>Borrowers tracked</CardDescription>
                    <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                      <IconUsersGroup className="size-5 text-emerald-500" />
                      {borrowerCount}
                    </CardTitle>
                  </CardHeader>
                  <CardFooter className="justify-between text-sm text-muted-foreground">
                    <span>Across {markets.length} markets</span>
                    <Button variant="ghost" asChild>
                      <Link href="/dashboard/borrowers">Browse</Link>
                    </Button>
                  </CardFooter>
                </Card>
              </div>
              <MarketsTable markets={markets} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
