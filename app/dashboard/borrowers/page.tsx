"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { BorrowersTable } from "@/components/borrowers-table"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { IconLoader } from "@tabler/icons-react"
import type { BorrowerData, Market } from "@/lib/morpho/types"
import * as React from "react"

export default function BorrowersPage() {
  const [markets, setMarkets] = React.useState<Market[]>([])
  const [selectedMarketKey, setSelectedMarketKey] = React.useState<string>("")
  const [borrowers, setBorrowers] = React.useState<BorrowerData[]>([])
  const [loading, setLoading] = React.useState(false)
  const [loadingMarkets, setLoadingMarkets] = React.useState(true)

  React.useEffect(() => {
    async function fetchMarkets() {
      try {
        const response = await fetch("/api/markets")
        const data = await response.json()
        if (data.markets) {
          setMarkets(data.markets)
          if (data.markets.length > 0) {
            setSelectedMarketKey(data.markets[0].uniqueKey)
          }
        }
      } catch (error) {
        console.error("Error fetching markets:", error)
      } finally {
        setLoadingMarkets(false)
      }
    }

    fetchMarkets()
  }, [])

  React.useEffect(() => {
    if (!selectedMarketKey) return

    async function fetchBorrowers() {
      setLoading(true)
      try {
        const response = await fetch(`/api/borrowers?marketKey=${selectedMarketKey}&chainId=137`)
        const data = await response.json()
        if (data.borrowers) {
          setBorrowers(data.borrowers)
        }
      } catch (error) {
        console.error("Error fetching borrowers:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchBorrowers()
  }, [selectedMarketKey])

  const selectedMarket = markets.find((m) => m.uniqueKey === selectedMarketKey)

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
        <SiteHeader title="Borrowers" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="flex flex-col gap-4 px-4 lg:px-6">
                <div className="flex items-center gap-4">
                  <Label htmlFor="market-select" className="text-sm font-medium">
                    Select Market:
                  </Label>
                  {loadingMarkets ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <IconLoader className="size-4 animate-spin" />
                      <span className="text-sm">Loading markets...</span>
                    </div>
                  ) : (
                    <Select
                      value={selectedMarketKey}
                      onValueChange={setSelectedMarketKey}
                    >
                      <SelectTrigger id="market-select" className="w-[300px]">
                        <SelectValue placeholder="Select a market" />
                      </SelectTrigger>
                      <SelectContent>
                        {markets.map((market) => (
                          <SelectItem key={market.uniqueKey} value={market.uniqueKey}>
                            {market.collateralAsset.symbol}/{market.loanAsset.symbol}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {selectedMarket && (
                    <div className="text-muted-foreground text-sm">
                      {borrowers.length} borrower{borrowers.length !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <IconLoader className="size-5 animate-spin" />
                      <span>Loading borrowers...</span>
                    </div>
                  </div>
                ) : selectedMarketKey && borrowers.length > 0 ? (
                  <BorrowersTable borrowers={borrowers} />
                ) : selectedMarketKey && borrowers.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    No borrowers found for this market.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
