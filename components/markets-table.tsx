"use client"

import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconArrowUp,
  IconArrowDown,
  IconArrowsSort,
  IconSearch,
} from "@tabler/icons-react"
import type { Market } from "@/lib/morpho/types"
import * as React from "react"

function formatCurrency(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`
  return `$${value.toFixed(2)}`
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

const columns: ColumnDef<Market>[] = [
  {
    id: "market",
    accessorFn: (row) => `${row.collateralAsset.symbol}/${row.loanAsset.symbol}`,
    header: "Market",
    enableSorting: false,
    filterFn: (row, id, value) => {
      const marketName = `${row.original.collateralAsset.symbol}/${row.original.loanAsset.symbol}`.toLowerCase()
      return marketName.includes(value.toLowerCase())
    },
    cell: ({ row }) => {
      const market = row.original
      return (
        <div className="font-medium">
          {market.collateralAsset.symbol}/{market.loanAsset.symbol}
        </div>
      )
    },
  },
  {
    accessorKey: "state.supplyAssetsUsd",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="h-8 data-[state=open]:bg-accent -ml-3 hover:bg-transparent"
        onClick={() => column.toggleSorting()}
      >
        <span>Supply</span>
        {column.getIsSorted() === "desc" ? (
          <IconArrowDown className="ml-2 size-4" />
        ) : column.getIsSorted() === "asc" ? (
          <IconArrowUp className="ml-2 size-4" />
        ) : (
          <IconArrowsSort className="ml-2 size-4 opacity-50" />
        )}
      </Button>
    ),
    cell: ({ row }) => formatCurrency(row.original.state.supplyAssetsUsd),
  },
  {
    accessorKey: "state.borrowAssetsUsd",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="h-8 data-[state=open]:bg-accent -ml-3 hover:bg-transparent"
        onClick={() => column.toggleSorting()}
      >
        <span>Borrow</span>
        {column.getIsSorted() === "desc" ? (
          <IconArrowDown className="ml-2 size-4" />
        ) : column.getIsSorted() === "asc" ? (
          <IconArrowUp className="ml-2 size-4" />
        ) : (
          <IconArrowsSort className="ml-2 size-4 opacity-50" />
        )}
      </Button>
    ),
    cell: ({ row }) => formatCurrency(row.original.state.borrowAssetsUsd),
  },
  {
    accessorKey: "state.utilization",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="h-8 data-[state=open]:bg-accent -ml-3 hover:bg-transparent"
        onClick={() => column.toggleSorting()}
      >
        <span>Utilization</span>
        {column.getIsSorted() === "desc" ? (
          <IconArrowDown className="ml-2 size-4" />
        ) : column.getIsSorted() === "asc" ? (
          <IconArrowUp className="ml-2 size-4" />
        ) : (
          <IconArrowsSort className="ml-2 size-4 opacity-50" />
        )}
      </Button>
    ),
    cell: ({ row }) => formatPercent(row.original.state.utilization),
  },
  {
    accessorKey: "state.netSupplyApy",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="h-8 data-[state=open]:bg-accent -ml-3 hover:bg-transparent"
        onClick={() => column.toggleSorting()}
      >
        <span>Supply APY</span>
        {column.getIsSorted() === "desc" ? (
          <IconArrowDown className="ml-2 size-4" />
        ) : column.getIsSorted() === "asc" ? (
          <IconArrowUp className="ml-2 size-4" />
        ) : (
          <IconArrowsSort className="ml-2 size-4 opacity-50" />
        )}
      </Button>
    ),
    cell: ({ row }) => formatPercent(row.original.state.netSupplyApy),
  },
  {
    accessorKey: "state.netBorrowApy",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="h-8 data-[state=open]:bg-accent -ml-3 hover:bg-transparent"
        onClick={() => column.toggleSorting()}
      >
        <span>Borrow APY</span>
        {column.getIsSorted() === "desc" ? (
          <IconArrowDown className="ml-2 size-4" />
        ) : column.getIsSorted() === "asc" ? (
          <IconArrowUp className="ml-2 size-4" />
        ) : (
          <IconArrowsSort className="ml-2 size-4 opacity-50" />
        )}
      </Button>
    ),
    cell: ({ row }) => formatPercent(row.original.state.netBorrowApy),
  },
]

export function MarketsTable({ markets }: { markets: Market[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 20,
  })

  const table = useReactTable({
    data: markets,
    columns,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const marketColumn = table.getColumn("market")
  const filterValue = (marketColumn?.getFilterValue() as string) ?? ""

  React.useEffect(() => {
    if (filterValue !== undefined) {
      table.setPageIndex(0)
    }
  }, [filterValue])

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search markets..."
            value={filterValue}
            onChange={(e) => marketColumn?.setFilterValue(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No markets found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{" "}
          of {table.getFilteredRowModel().rows.length} markets
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="hidden size-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to first page</span>
            <IconChevronsLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to previous page</span>
            <IconChevronLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to next page</span>
            <IconChevronRight />
          </Button>
          <Button
            variant="outline"
            className="hidden size-8 lg:flex"
            size="icon"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to last page</span>
            <IconChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  )
}

