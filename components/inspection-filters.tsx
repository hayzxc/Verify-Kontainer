"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, X, ChevronDown, ChevronUp, Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export interface FilterState {
    search: string
    status: string
    commodityType: string
    createdBy: string
    dateFrom: string
    dateTo: string
}

interface InspectionFiltersProps {
    onFilterChange: (filters: FilterState) => void
    showCreatedByFilter?: boolean
    verificatorOptions?: string[]
    commodityOptions?: string[]
}

const STATUS_OPTIONS = [
    { value: "", label: "Semua Status" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Disetujui" },
    { value: "needs_correction", label: "Perlu Perbaikan" },
]

const COMMODITY_OPTIONS = [
    { value: "", label: "Semua Komoditi" },
    { value: "Copra", label: "Copra" },
    { value: "Kelapa", label: "Kelapa" },
    { value: "Jagung", label: "Jagung" },
    { value: "Beras", label: "Beras" },
    { value: "Kedelai", label: "Kedelai" },
    { value: "Kacang", label: "Kacang" },
    { value: "Lainnya", label: "Lainnya" },
]

export function InspectionFilters({
    onFilterChange,
    showCreatedByFilter = false,
    verificatorOptions = [],
}: InspectionFiltersProps) {
    const [filters, setFilters] = useState<FilterState>({
        search: "",
        status: "",
        commodityType: "",
        createdBy: "",
        dateFrom: "",
        dateTo: "",
    })
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

    // Debounced search
    const debouncedSearch = useCallback((value: string) => {
        if (searchTimeout) {
            clearTimeout(searchTimeout)
        }
        const timeout = setTimeout(() => {
            setFilters(prev => {
                const newFilters = { ...prev, search: value }
                return newFilters
            })
        }, 300)
        setSearchTimeout(timeout)
    }, [searchTimeout])

    // Emit filter changes
    useEffect(() => {
        onFilterChange(filters)
    }, [filters, onFilterChange])

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (searchTimeout) {
                clearTimeout(searchTimeout)
            }
        }
    }, [searchTimeout])

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        // Update local state immediately for responsive UI
        debouncedSearch(value)
    }

    const handleFilterChange = (key: keyof FilterState, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }

    const clearFilters = () => {
        setFilters({
            search: "",
            status: "",
            commodityType: "",
            createdBy: "",
            dateFrom: "",
            dateTo: "",
        })
        // Clear the search input
        const searchInput = document.getElementById("inspection-search") as HTMLInputElement
        if (searchInput) {
            searchInput.value = ""
        }
    }

    const hasActiveFilters = Object.values(filters).some(v => v !== "")

    return (
        <div className="space-y-3 mb-6">
            {/* Main search bar */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="inspection-search"
                        placeholder="Cari shipper atau nomor kontainer..."
                        className="pl-9"
                        defaultValue={filters.search}
                        onChange={handleSearchChange}
                    />
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={showAdvanced ? "bg-muted" : ""}
                    title="Filter lanjutan"
                >
                    {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                        <X className="h-4 w-4 mr-1" />
                        Hapus Filter
                    </Button>
                )}
            </div>

            {/* Advanced filters */}
            {showAdvanced && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-muted/30 rounded-lg border">
                    {/* Status filter */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                        <Select value={filters.status} onValueChange={(v) => handleFilterChange("status", v)}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Semua Status" />
                            </SelectTrigger>
                            <SelectContent>
                                {STATUS_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value || "all"}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Commodity filter */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Komoditi</label>
                        <Select value={filters.commodityType} onValueChange={(v) => handleFilterChange("commodityType", v)}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Semua Komoditi" />
                            </SelectTrigger>
                            <SelectContent>
                                {COMMODITY_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value || "all"}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Created by filter (admin only) */}
                    {showCreatedByFilter && verificatorOptions.length > 0 && (
                        <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Verifikator</label>
                            <Select value={filters.createdBy} onValueChange={(v) => handleFilterChange("createdBy", v)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Semua Verifikator" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Verifikator</SelectItem>
                                    {verificatorOptions.map(name => (
                                        <SelectItem key={name} value={name}>
                                            {name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Date range */}
                    <div className={showCreatedByFilter && verificatorOptions.length > 0 ? "" : "sm:col-span-2"}>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            Rentang Tanggal
                        </label>
                        <div className="flex gap-2">
                            <Input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                                className="text-sm"
                            />
                            <span className="text-muted-foreground self-center">-</span>
                            <Input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                                className="text-sm"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Active filters summary */}
            {hasActiveFilters && !showAdvanced && (
                <div className="flex flex-wrap gap-2 text-xs">
                    {filters.status && (
                        <span className="bg-primary/10 text-primary px-2 py-1 rounded-full">
                            Status: {STATUS_OPTIONS.find(o => o.value === filters.status)?.label}
                        </span>
                    )}
                    {filters.commodityType && (
                        <span className="bg-primary/10 text-primary px-2 py-1 rounded-full">
                            Komoditi: {filters.commodityType}
                        </span>
                    )}
                    {filters.createdBy && (
                        <span className="bg-primary/10 text-primary px-2 py-1 rounded-full">
                            Verifikator: {filters.createdBy}
                        </span>
                    )}
                    {(filters.dateFrom || filters.dateTo) && (
                        <span className="bg-primary/10 text-primary px-2 py-1 rounded-full">
                            Tanggal: {filters.dateFrom || "..."} - {filters.dateTo || "..."}
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}
