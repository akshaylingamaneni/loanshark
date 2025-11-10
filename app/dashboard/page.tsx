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
import { IconAlertTriangle } from "@tabler/icons-react"
import { getMarkets } from "@/lib/morpho/markets"
import { getDailyReimbursementSummary } from "@/lib/reimbursements/metrics"
import { DashboardCharts } from "@/components/dashboard-chart"

type SidebarStyle = CSSProperties & {
  "--sidebar-width": string
  "--header-height": string
}

const sidebarStyle: SidebarStyle = {
  "--sidebar-width": "calc(var(--spacing) * 72)",
  "--header-height": "calc(var(--spacing) * 12)",
}

export const dynamic = 'force-dynamic'

export default async function Page() {
  const [markets, reimbursementSummary] = await Promise.all([
    getMarkets([137]),
    getDailyReimbursementSummary(),
  ]);

  const summaryMarkets = reimbursementSummary?.markets ?? []
  const reimbursementAlerts = summaryMarkets.filter((entry) => entry.reimbursementUsd > 0).length
  const utilizationAlerts = markets.filter((market) => market.state.utilization >= 0.85).length
  const activeAlerts = reimbursementAlerts + utilizationAlerts

  return (
    <SidebarProvider style={sidebarStyle}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards markets={markets} reimbursementSummary={reimbursementSummary} />
              <div className="px-4 lg:px-6">
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
              </div>
              <DashboardCharts markets={markets} reimbursements={reimbursementSummary?.markets ?? []} />
              <MarketsTable markets={markets} />

            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
