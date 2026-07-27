"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
} from "recharts"
import {
    TrendingUp,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Download,
    FileSpreadsheet,
    FileText,
    Filter,
    RefreshCw,
    Package,
    Building2,
} from "lucide-react"
import type { Inspection } from "@/types/inspection"
import { exportToCSV, exportToExcel } from "@/lib/export-utils"
import { GooeyLoader } from "@/components/ui/gooey-loader"

interface AnalyticsData {
    kpi: {
        totalInspections: number
        approvedCount: number
        pendingCount: number
        needsCorrectionCount: number
        approvalRate: number
        avgTurnaroundHours: string
    }
    trends: Array<{
        date: string
        total: number
        approved: number
        pending: number
        needsCorrection: number
    }>
    topShippers: Array<{
        name: string
        total: number
        approved: number
    }>
    commodityDistribution: Array<{
        commodity: string
        count: number
    }>
    statusDistribution: Array<{
        status: string
        count: number
        label: string
    }>
}

const STATUS_COLORS: Record<string, string> = {
    approved: "#10B981", // Emerald
    pending: "#F59E0B", // Amber
    needs_correction: "#EF4444", // Red
}

export function AnalyticsDashboard({ inspections = [] }: { inspections?: Inspection[] }) {
    const [timeframe, setTimeframe] = useState<string>("30d")
    const [commodityFilter, setCommodityFilter] = useState<string>("all")
    const [loading, setLoading] = useState<boolean>(true)
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)

    const fetchAnalytics = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (commodityFilter !== "all") params.set("commodityType", commodityFilter)

            // Date range logic based on timeframe
            const now = new Date()
            if (timeframe === "7d") {
                const past7 = new Date(now)
                past7.setDate(past7.getDate() - 7)
                params.set("dateFrom", past7.toISOString().split("T")[0])
            } else if (timeframe === "30d") {
                const past30 = new Date(now)
                past30.setDate(past30.getDate() - 30)
                params.set("dateFrom", past30.toISOString().split("T")[0])
            }

            const res = await fetch(`/api/analytics?${params.toString()}`, { credentials: "include" })
            if (res.ok) {
                const data = await res.json()
                setAnalytics(data)
            }
        } catch (error) {
            console.error("Failed to fetch analytics data:", error)
        } finally {
            setLoading(false)
        }
    }, [timeframe, commodityFilter])

    useEffect(() => {
        fetchAnalytics()
    }, [fetchAnalytics])

    // Get unique commodity options
    const commodityOptions = Array.from(new Set(inspections.map((i) => i.commodityType).filter(Boolean)))

    const handleExportExcel = () => {
        const timestamp = new Date().toISOString().split("T")[0]
        exportToExcel(inspections, `Laporan_Inspeksi_Kontainer_${timestamp}.xls`)
    }

    const handleExportCSV = () => {
        const timestamp = new Date().toISOString().split("T")[0]
        exportToCSV(inspections, `Laporan_Inspeksi_Kontainer_${timestamp}.csv`)
    }

    return (
        <div className="space-y-6">
            {/* Header & Export Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 sm:p-5 rounded-xl border shadow-xs">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                        <TrendingUp className="h-6 w-6 text-primary" />
                        Eksekutif Analitik & Laporan
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        Ringkasan performa verifikasi inspeksi, grafik tren, dan unduhan laporan
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-xs flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-emerald-600" />
                        Ekspor CSV
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleExportExcel}
                        className="text-xs flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white"
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        Ekspor Excel (.xlsx)
                    </Button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3.5 rounded-lg border border-border">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Filter className="h-3.5 w-3.5" />
                    <span>Filter Data:</span>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Rentang Waktu:</span>
                        <Select value={timeframe} onValueChange={setTimeframe}>
                            <SelectTrigger className="w-[130px] h-8 text-xs">
                                <SelectValue placeholder="Pilih Waktu" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7d">7 Hari Terakhir</SelectItem>
                                <SelectItem value="30d">30 Hari Terakhir</SelectItem>
                                <SelectItem value="all">Semua Waktu</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Komoditi:</span>
                        <Select value={commodityFilter} onValueChange={setCommodityFilter}>
                            <SelectTrigger className="w-[150px] h-8 text-xs">
                                <SelectValue placeholder="Semua Komoditi" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Komoditi</SelectItem>
                                {commodityOptions.map((c) => (
                                    <SelectItem key={c} value={c}>
                                        {c}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button variant="ghost" size="icon" onClick={fetchAnalytics} title="Perbarui Data" className="h-8 w-8">
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </div>

            {loading && !analytics ? (
                <div className="py-20 flex justify-center items-center">
                    <GooeyLoader text="Memuat data analitik..." size="lg" />
                </div>
            ) : (
                <>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card className="border-l-4 border-l-primary">
                    <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                            <span>Total Volume Inspeksi</span>
                            <Package className="h-4 w-4 text-primary" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                        <p className="text-2xl sm:text-3xl font-bold">{analytics?.kpi.totalInspections || 0}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Kontainer terinspeksi</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-emerald-500">
                    <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                            <span>Tingkat Persetujuan</span>
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl sm:text-3xl font-bold text-emerald-600">{analytics?.kpi.approvalRate || 0}%</p>
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0">
                                {analytics?.kpi.approvedCount || 0} disetujui
                            </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Rasio inspeksi lolos verifikasi</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-500">
                    <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                            <span>Rata-Rata Waktu Proses</span>
                            <Clock className="h-4 w-4 text-amber-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                        <p className="text-2xl sm:text-3xl font-bold text-amber-600">
                            {analytics?.kpi.avgTurnaroundHours || "0"} <span className="text-sm font-normal text-muted-foreground">jam</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Dari pembuatan hingga verifikasi</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500">
                    <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                            <span>Perlu Perbaikan</span>
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                        <p className="text-2xl sm:text-3xl font-bold text-red-600">{analytics?.kpi.needsCorrectionCount || 0}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Memerlukan tindakan petugas</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Timeline Trend Chart */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Tren Volume & Kelulusan Inspeksi
                        </CardTitle>
                        <CardDescription>Perkembangan jumlah inspeksi dan status verifikasi harian</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {!analytics?.trends || analytics.trends.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                                Belum ada data tren untuk periode ini
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analytics.trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "var(--card)", borderRadius: "8px", borderColor: "var(--border)" }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                                    <Area type="monotone" dataKey="total" name="Total Inspeksi" stroke="#3B82F6" fillOpacity={1} fill="url(#colorTotal)" />
                                    <Area type="monotone" dataKey="approved" name="Disetujui" stroke="#10B981" fillOpacity={1} fill="url(#colorApproved)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Status Donut Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Distribusi Status</CardTitle>
                        <CardDescription>Proporsi status inspeksi</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] flex flex-col items-center justify-center">
                        {!analytics?.statusDistribution || analytics.kpi.totalInspections === 0 ? (
                            <div className="text-sm text-muted-foreground">Belum ada data status</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={analytics.statusDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={85}
                                        paddingAngle={4}
                                        dataKey="count"
                                        nameKey="label"
                                    >
                                        {analytics.statusDistribution.map((entry) => (
                                            <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#94a3b8"} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderRadius: "8px", borderColor: "var(--border)" }} />
                                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Top 5 Shippers Chart */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            Top 5 Shipper Terbanyak
                        </CardTitle>
                        <CardDescription>Perusahaan pengirim dengan volume inspeksi tertinggi</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[280px]">
                        {!analytics?.topShippers || analytics.topShippers.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                                Belum ada data shipper
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={analytics.topShippers} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                                    <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderRadius: "8px", borderColor: "var(--border)" }} />
                                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                                    <Bar dataKey="total" name="Total Inspeksi" fill="#6366F1" radius={[0, 4, 4, 0]} />
                                    <Bar dataKey="approved" name="Disetujui" fill="#10B981" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Commodity Distribution Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Breakdown Komoditi</CardTitle>
                        <CardDescription>Volume per jenis barang</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[280px]">
                        {!analytics?.commodityDistribution || analytics.commodityDistribution.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                                Belum ada data komoditi
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.commodityDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                    <XAxis dataKey="commodity" tick={{ fontSize: 11 }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                    <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderRadius: "8px", borderColor: "var(--border)" }} />
                                    <Bar dataKey="count" name="Jumlah Inspeksi" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>
            </>
            )}
        </div>
    )
}
