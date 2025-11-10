import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";

import { SectionCards } from "@/components/section-cards";
import { Button } from "@/components/ui/button";
import { getMarkets } from "@/lib/morpho/markets";
import { getDailyReimbursementSummary } from "@/lib/reimbursements/metrics";

export const dynamic = 'force-dynamic'

export default async function Home() {
  const [markets, reimbursementSummary] = await Promise.all([
    getMarkets([137]),
    getDailyReimbursementSummary(),
  ]);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border bg-card/70 p-10 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-6">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                Loanshark
              </p>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Expore Polygon Markets.
              </h1>
              <p className="text-lg text-muted-foreground">
                Monitor Morpho markets, track capped APR programs, and drill into borrowers or alerts
                in one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
              <Button size="lg" variant="ghost" asChild>
                <Link href="/dashboard/alerts">
                  Explore alerts
                  <IconArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
        <SectionCards markets={markets} reimbursementSummary={reimbursementSummary} />
      </div>
    </main>
  );
}
