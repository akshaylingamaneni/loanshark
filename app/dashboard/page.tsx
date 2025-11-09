import { AppSidebar } from "@/components/app-sidebar"
import { MarketsTable } from "@/components/markets-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { getMarkets } from "@/lib/morpho/markets"
import { getDailyReimbursementSummary } from "@/lib/reimbursements/metrics"

export default async function Page() {
  const [markets, reimbursementSummary] = await Promise.all([
    getMarkets([137]),
    getDailyReimbursementSummary(),
  ]);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards markets={markets} reimbursementSummary={reimbursementSummary} />
              <MarketsTable markets={markets} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
