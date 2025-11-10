"use client"

import * as React from "react"
import { format } from "date-fns"
import { IconCalendar } from "@tabler/icons-react"
import { toast } from "sonner"

import { ManagedMarket } from "@/lib/reimbursements/market-caps"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type MarketsManagerProps = {
  initialMarkets: ManagedMarket[]
}

type RowState = ManagedMarket & {
  draftCapAprPercent: string
  draftIsTracked: boolean
  saving: boolean
}

function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return "$0.00"
  if (Math.abs(value) >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(2)}K`
  return `$${value.toFixed(2)}`
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0.00%"
  return `${(value * 100).toFixed(2)}%`
}

function toPercentString(value: number | null): string {
  if (!value || !Number.isFinite(value)) return ""
  return (value * 100).toFixed(2)
}

function parseCapAprPercent(value: string): number | null {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  return numeric / 100
}

function isNearlyEqual(a: number | null | undefined, b: number | null | undefined) {
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  return Math.abs(a - b) <= 0.000001
}

function isRowDirty(row: RowState): boolean {
  const draftCap = parseCapAprPercent(row.draftCapAprPercent)
  return row.draftIsTracked !== row.isTracked || !isNearlyEqual(draftCap, row.capApr ?? null)
}

function formatLltv(lltv: string): string {
  const numeric = Number(lltv)
  if (!Number.isFinite(numeric)) return lltv
  const normalized = numeric > 1 ? numeric / 1_000_000_000_000_000_000 : numeric
  return `${(normalized * 100).toFixed(2)}%`
}

function normalizeDate(date: Date) {
  const normalized = new Date(date)
  normalized.setUTCHours(0, 0, 0, 0)
  return normalized
}

function getDefaultRunDate() {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return normalizeDate(d)
}

export function MarketsManager({ initialMarkets }: MarketsManagerProps) {
  const [rows, setRows] = React.useState<RowState[]>(() =>
    initialMarkets.map((market) => ({
      ...market,
      draftCapAprPercent: toPercentString(market.capApr ?? market.suggestedCapApr ?? null),
      draftIsTracked: market.isTracked,
      saving: false,
    }))
  )
  const [search, setSearch] = React.useState("")
  const [runDate, setRunDate] = React.useState<Date>(getDefaultRunDate)
  const [calendarOpen, setCalendarOpen] = React.useState(false)
  const [running, setRunning] = React.useState(false)

  const datePickerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handlePointer(event: MouseEvent) {
      if (!calendarOpen) return
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setCalendarOpen(false)
      }
    }
    if (calendarOpen) {
      document.addEventListener("pointerdown", handlePointer)
    }
    return () => document.removeEventListener("pointerdown", handlePointer)
  }, [calendarOpen])

  const trackedCount = rows.filter((row) => row.draftIsTracked).length

  const filteredRows = rows.filter((row) => {
    if (!search) return true
    const target = `${row.collateralAsset.symbol}/${row.loanAsset.symbol}`.toLowerCase()
    return target.includes(search.toLowerCase())
  })

  function updateRow(
    uniqueKey: string,
    updater: (row: RowState) => RowState
  ) {
    setRows((prev) => prev.map((row) => (row.uniqueKey === uniqueKey ? updater(row) : row)))
  }

  function handleToggle(uniqueKey: string, checked: boolean) {
    updateRow(uniqueKey, (row) => {
      const nextValue =
        checked && (!row.draftCapAprPercent || Number(row.draftCapAprPercent) <= 0)
          ? toPercentString(row.capApr ?? row.suggestedCapApr ?? 0)
          : row.draftCapAprPercent

      return {
        ...row,
        draftIsTracked: checked,
        draftCapAprPercent: nextValue ?? "",
      }
    })
  }

  function handleCapChange(uniqueKey: string, value: string) {
    updateRow(uniqueKey, (row) => ({
      ...row,
      draftCapAprPercent: value,
    }))
  }

  async function saveRow(uniqueKey: string) {
    const row = rows.find((item) => item.uniqueKey === uniqueKey)
    if (!row) return

    const capAprDecimal = parseCapAprPercent(row.draftCapAprPercent)

    if (row.draftIsTracked && (!capAprDecimal || capAprDecimal <= 0)) {
      toast.error("Tracked markets must have a positive cap APR.")
      return
    }

    updateRow(uniqueKey, (current) => ({
      ...current,
      saving: true,
    }))

    try {
      const response = await fetch("/api/market-config", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uniqueKey: row.uniqueKey,
          chainId: row.chainId ?? 137,
          capApr: Number.isFinite(capAprDecimal) && capAprDecimal ? capAprDecimal : 0,
          isTracked: row.draftIsTracked,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.error ?? "Request failed")
      }

      const data = await response.json()
      const updatedCapApr = Number.isFinite(data?.market?.capApr)
        ? Number(data.market.capApr)
        : capAprDecimal ?? 0

      updateRow(uniqueKey, (current) => ({
        ...current,
        capApr: updatedCapApr,
        draftCapAprPercent: toPercentString(updatedCapApr),
        isTracked: row.draftIsTracked,
        draftIsTracked: row.draftIsTracked,
        saving: false,
      }))

      toast.success("Market configuration updated")
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "Failed to save market")
      updateRow(uniqueKey, (current) => ({
        ...current,
        saving: false,
      }))
    }
  }

  async function runJob(event: React.FormEvent) {
    event.preventDefault()
    setRunning(true)
    try {
      const response = await fetch("/api/reimbursements/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ date: runDate.toISOString().slice(0, 10) }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.error ?? "Job failed to start")
      }

      const data = await response.json()
      const result = data?.result
      toast.success(
        result
          ? `Processed ${result.marketsProcessed} markets for ${result.day}`
          : "Reimbursement job completed"
      )
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "Failed to run job")
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      <div className="grid gap-4 @lg/main:grid-cols-2">
        <Card>
          <form onSubmit={runJob}>
            <CardHeader>
              <CardDescription>Trigger the reimbursement script from the dashboard.</CardDescription>
              <CardTitle>Run reimbursements</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Label className="text-sm font-medium">Target date</Label>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative" ref={datePickerRef}>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => setCalendarOpen((prev) => !prev)}
                  >
                    <IconCalendar className="size-4" />
                    {format(runDate, "MMM dd, yyyy")}
                  </Button>
                  {calendarOpen ? (
                    <div className="absolute z-30 mt-2 rounded-xl border bg-popover shadow-lg">
                      <Calendar
                        mode="single"
                        selected={runDate}
                        disabled={(date) => date > new Date()}
                        onSelect={(date) => {
                          if (date) {
                            setRunDate(normalizeDate(date))
                            setCalendarOpen(false)
                          }
                        }}
                        initialFocus
                      />
                    </div>
                  ) : null}
                </div>
                <Button type="submit" disabled={running}>
                  {running ? "Running..." : "Run job"}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Markets currently tracked for reimbursement caps.</CardDescription>
            <CardTitle>Tracked markets</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Active markets</span>
              <Badge variant="outline">{trackedCount}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Suggested caps</span>
              <span>Defaults pulled from `DEFAULT_MARKET_CAPS`.</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Market selection</CardTitle>
            <CardDescription>Enable tracking and define APR caps per market.</CardDescription>
          </div>
          <Input
            className="max-w-xs"
            placeholder="Search..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Market</TableHead>
                  <TableHead>Cap APR (%)</TableHead>
                  <TableHead>Tracked</TableHead>
                  <TableHead>Borrow</TableHead>
                  <TableHead>Utilization</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                      No markets match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => {
                    const pendingCapApr = parseCapAprPercent(row.draftCapAprPercent)
                    const disableSave =
                      row.saving ||
                      !isRowDirty(row) ||
                      (row.draftIsTracked && (!pendingCapApr || pendingCapApr <= 0))

                    return (
                      <TableRow key={row.uniqueKey}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {row.collateralAsset.symbol}/{row.loanAsset.symbol}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {row.uniqueKey.slice(0, 10)}… · Chain {row.chainId ?? 137} · LLTV {formatLltv(row.lltv)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.draftCapAprPercent}
                            onChange={(event) => handleCapChange(row.uniqueKey, event.target.value)}
                            disabled={row.saving}
                          />
                          {row.suggestedCapApr && (
                            <p className="text-[11px] text-muted-foreground">
                              Suggestion: {(row.suggestedCapApr * 100).toFixed(2)}%
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={row.draftIsTracked}
                              onCheckedChange={(checked) => handleToggle(row.uniqueKey, checked === true)}
                              disabled={row.saving}
                            />
                            <span className="text-xs text-muted-foreground">
                              {row.draftIsTracked ? "Enabled" : "Paused"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(row.state.borrowAssetsUsd)}</TableCell>
                        <TableCell>{formatPercent(row.state.utilization)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={disableSave}
                            onClick={() => saveRow(row.uniqueKey)}
                          >
                            {row.saving ? "Saving..." : "Save"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
