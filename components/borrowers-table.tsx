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
  IconCopy,
} from "@tabler/icons-react"
import type { BorrowerData } from "@/lib/morpho/types"
import { toast } from "sonner"
import * as React from "react"

function formatCurrency(value: number | null): string {
  if (value === null) return "-"
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`
  return `$${value.toFixed(2)}`
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const columns: ColumnDef<BorrowerData>[] = [
  {
    id: "address",
    accessorKey: "address",
    header: "Address",
    enableSorting: false,
    filterFn: (row, id, value) => {
      const address = row.original.address.toLowerCase()
      return address.includes(value.toLowerCase())
    },
    cell: ({ row }) => {
      const handleCopy = async () => {
        try {
          await navigator.clipboard.writeText(row.original.address)
          toast.success("Address copied to clipboard")
        } catch (error) {
          toast.error("Failed to copy")
        }
      }
      return (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">
            {formatAddress(row.original.address)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 h-6 w-6"
            onClick={handleCopy}
          >
            <IconCopy className="size-3" />
          </Button>
        </div>
      )
    },
  },
  {
    accessorKey: "borrowAssetsUsd",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="h-8 data-[state=open]:bg-accent -ml-3 hover:bg-transparent"
        onClick={() => column.toggleSorting()}
      >
        <span>Borrowed (USD)</span>
        {column.getIsSorted() === "desc" ? (
          <IconArrowDown className="ml-2 size-4" />
        ) : column.getIsSorted() === "asc" ? (
          <IconArrowUp className="ml-2 size-4" />
        ) : (
          <IconArrowsSort className="ml-2 size-4 opacity-50" />
        )}
      </Button>
    ),
    cell: ({ row }) => formatCurrency(row.original.borrowAssetsUsd),
  },
  {
    accessorKey: "borrowApy",
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
    cell: ({ row }) => formatPercent(row.original.borrowApy),
  },
]

export function BorrowersTable({ borrowers }: { borrowers: BorrowerData[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "borrowAssetsUsd", desc: true },
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 20,
  })

  const table = useReactTable({
    data: borrowers,
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

  const addressColumn = table.getColumn("address")
  const filterValue = (addressColumn?.getFilterValue() as string) ?? ""

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
            placeholder="Search borrowers..."
            value={filterValue}
            onChange={(e) => addressColumn?.setFilterValue(e.target.value)}
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
                  No borrowers found.
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
          of {table.getFilteredRowModel().rows.length} borrowers
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

