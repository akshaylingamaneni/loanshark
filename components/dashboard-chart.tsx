"use client"
import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import { type Market } from "@/lib/morpho/types"
import type { MarketReimbursementBreakdown } from "@/lib/reimbursements/metrics"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type DashboardChartsProps = {
  markets: Market[]
  reimbursements: MarketReimbursementBreakdown[]
}

function formatCurrency(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "$0"
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`
  return `$${value.toFixed(2)}`
}

function formatMillions(value: number): string {
  if (!Number.isFinite(value)) return "$0"
  return `$${(value / 1_000_000).toFixed(1)}M`
}

const supplyBorrowConfig: ChartConfig = {
  supply: { label: "Supply", color: "var(--chart-1)" },
  borrow: { label: "Borrow", color: "var(--chart-2)" },
}

const borrowerImpactConfig: ChartConfig = {
  remaining: { label: "Within cap", color: "var(--chart-2)" },
  impacted: { label: "Above cap", color: "var(--chart-4)" },
}
export function DashboardCharts({ markets, reimbursements }: DashboardChartsProps) {
  const marketLabelMap = React.useMemo(
    () =>
      new Map(
        markets.map((market) => [
          market.uniqueKey,
          `${market.collateralAsset.symbol}/${market.loanAsset.symbol}`,
        ])
      ),
    [markets]
  )
  const supplyBorrowData = React.useMemo(() => {
    return [...markets]
      .sort((a, b) => b.state.borrowAssetsUsd - a.state.borrowAssetsUsd)
      .slice(0, 5)
      .map((market) => ({
        name: `${market.collateralAsset.symbol}/${market.loanAsset.symbol}`,
        supply: Number(market.state.supplyAssetsUsd || 0),
        borrow: Number(market.state.borrowAssetsUsd || 0),
      }))
  }, [markets])
  const borrowerImpactData = React.useMemo(() => {
    if (!reimbursements?.length) return []
    return [...reimbursements]
      .sort((a, b) => b.borrowersAboveCap - a.borrowersAboveCap)
      .slice(0, 5)
      .map((entry) => {
        const totalBorrowers = Number(entry.borrowerCount ?? 0)
        const impacted = Number(entry.borrowersAboveCap ?? 0)
        return {
          name: marketLabelMap.get(entry.marketKey) ?? entry.marketKey.slice(0, 8),
          impacted,
          remaining: Math.max(totalBorrowers - impacted, 0),
          totalBorrowers,
        }
      })
      .filter((entry) => entry.totalBorrowers > 0)
  }, [reimbursements, marketLabelMap])
  return (
    <div className="grid gap-6 px-4 lg:px-6 @lg/main:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Supply vs Borrow (Top 5)</CardTitle>
        </CardHeader>
        <CardContent>
          {supplyBorrowData.length === 0 ? (
            <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
              No active markets available.
            </div>
          ) : (
            <ChartContainer config={supplyBorrowConfig} className="h-[340px] w-full">
              <BarChart
                accessibilityLayer
                data={supplyBorrowData}
                margin={{ top: 20, right: 12, bottom: 40, left: 8 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs"
                  interval={0}
                />
                <YAxis
                  tickFormatter={formatMillions}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                  className="text-xs"
                />
                <ChartTooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.1 }}
                  content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />}
                />
                <ChartLegend
                  verticalAlign="top"
                  content={<ChartLegendContent verticalAlign="top" />}
                  wrapperStyle={{ paddingBottom: 12 }}
                />
                <Bar dataKey="supply" fill="var(--color-supply)" fillOpacity={0.5} radius={[4, 4, 0, 0]} />
                <Bar dataKey="borrow" fill="var(--color-borrow)" fillOpacity={0.5} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Borrower Impact (Top 5)</CardTitle>
          <CardDescription>
            Markets ranked by the share of borrowers exceeding the reimbursement cap.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {borrowerImpactData.length === 0 ? (
            <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
              No borrower impact data available.
            </div>
          ) : (
            <ChartContainer config={borrowerImpactConfig} className="h-[340px] w-full">
              <BarChart
                accessibilityLayer
                data={borrowerImpactData}
                margin={{ top: 20, right: 12, bottom: 40, left: 8 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs"
                  interval={0}
                />
                <YAxis
                  tickFormatter={(value) =>
                    typeof value === "number" ? value.toLocaleString() : String(value)
                  }
                  tickLine={false}
                  axisLine={false}
                  width={60}
                  className="text-xs"
                />
                <ChartTooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.1 }}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label, payload) => {
                        const dataPoint = payload?.[0]?.payload as
                          | (typeof borrowerImpactData)[number]
                          | undefined
                        if (!dataPoint) return label
                        const percent = dataPoint.totalBorrowers
                          ? ((dataPoint.impacted / dataPoint.totalBorrowers) * 100).toFixed(1)
                          : "0.0"
                        const labelText =
                          typeof label === "string" ? label : String(label ?? "")
                        return `${labelText} · ${percent}% impacted`
                      }}
                      formatter={(value, name) => {
                        const resolvedValue =
                          typeof value === "number" || typeof value === "string"
                            ? Number(value)
                            : 0
                        const labelText =
                          typeof name === "string" ? name : String(name ?? "")
                        return (
                          <div className="flex w-full items-center justify-between gap-4">
                            <span className="text-muted-foreground">{labelText}</span>
                            <span className="font-mono font-medium">
                              {Number.isFinite(resolvedValue)
                                ? resolvedValue.toLocaleString()
                                : "0"}
                            </span>
                          </div>
                        )
                      }}
                    />
                  }
                />
                <ChartLegend
                  verticalAlign="top"
                  content={<ChartLegendContent verticalAlign="top" />}
                  wrapperStyle={{ paddingBottom: 12 }}
                />
                <Bar dataKey="remaining" stackId="impact" fill="var(--color-remaining)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="impacted" stackId="impact" fill="var(--color-impacted)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
