import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifySession } from "@/lib/auth"
import { apiError } from "@/lib/api-response"

export async function GET(req: Request) {
    try {
        const session = await verifySession()
        if (!session) {
            return apiError("Unauthorized", 401)
        }

        const { searchParams } = new URL(req.url)
        const commodityType = searchParams.get("commodityType") || ""
        const createdBy = searchParams.get("createdBy") || ""
        const dateFrom = searchParams.get("dateFrom") || ""
        const dateTo = searchParams.get("dateTo") || ""

        // Build dynamic where clause
        const where: Prisma.InspectionWhereInput = {}

        if (commodityType && commodityType !== "all") {
            where.commodityType = commodityType
        }

        if (createdBy && createdBy !== "all") {
            where.createdBy = createdBy
        }

        if (dateFrom || dateTo) {
            where.createdAt = {}
            if (dateFrom) {
                where.createdAt.gte = new Date(dateFrom)
            }
            if (dateTo) {
                const endDate = new Date(dateTo)
                endDate.setDate(endDate.getDate() + 1)
                where.createdAt.lte = endDate
            }
        }

        // Fetch all matching inspections for detailed analytics aggregation
        const inspections = await db.inspection.findMany({
            where,
            orderBy: {
                createdAt: "asc",
            },
            select: {
                id: true,
                shipperName: true,
                commodityType: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                createdBy: true,
            },
        })

        const totalInspections = inspections.length
        let approvedCount = 0
        let pendingCount = 0
        let needsCorrectionCount = 0
        let totalTurnaroundTimeMs = 0
        let turnaroundCount = 0

        const shipperMap: Record<string, { total: number; approved: number }> = {}
        const commodityMap: Record<string, number> = {}
        const trendMap: Record<string, { date: string; total: number; approved: number; pending: number; needsCorrection: number }> = {}

        for (const item of inspections) {
            // Count status
            if (item.status === "approved") {
                approvedCount++
                if (item.updatedAt && item.createdAt) {
                    const diff = new Date(item.updatedAt).getTime() - new Date(item.createdAt).getTime()
                    if (diff > 0) {
                        totalTurnaroundTimeMs += diff
                        turnaroundCount++
                    }
                }
            } else if (item.status === "pending") {
                pendingCount++
            } else if (item.status === "needs_correction") {
                needsCorrectionCount++
            }

            // Top shippers
            const shipper = item.shipperName || "Tidak Diketahui"
            if (!shipperMap[shipper]) {
                shipperMap[shipper] = { total: 0, approved: 0 }
            }
            shipperMap[shipper].total += 1
            if (item.status === "approved") {
                shipperMap[shipper].approved += 1
            }

            // Commodity distribution
            const commodity = item.commodityType || "Lainnya"
            commodityMap[commodity] = (commodityMap[commodity] || 0) + 1

            // Date trends (YYYY-MM-DD)
            const dateStr = new Date(item.createdAt).toISOString().split("T")[0]
            if (!trendMap[dateStr]) {
                trendMap[dateStr] = { date: dateStr, total: 0, approved: 0, pending: 0, needsCorrection: 0 }
            }
            trendMap[dateStr].total += 1
            if (item.status === "approved") trendMap[dateStr].approved += 1
            else if (item.status === "pending") trendMap[dateStr].pending += 1
            else if (item.status === "needs_correction") trendMap[dateStr].needsCorrection += 1
        }

        // Calculate KPI values
        const approvalRate = totalInspections > 0 ? Math.round((approvedCount / totalInspections) * 100) : 0
        const avgTurnaroundHours = turnaroundCount > 0 ? (totalTurnaroundTimeMs / (turnaroundCount * 1000 * 3600)).toFixed(1) : "0"

        // Format top shippers (Sort by volume descending, take top 5)
        const topShippers = Object.entries(shipperMap)
            .map(([name, data]) => ({
                name,
                total: data.total,
                approved: data.approved,
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5)

        // Format commodity distribution
        const commodityDistribution = Object.entries(commodityMap).map(([commodity, count]) => ({
            commodity,
            count,
        }))

        // Format trend timeline array sorted chronologically
        const trends = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date))

        // Format status distribution
        const statusDistribution = [
            { status: "approved", count: approvedCount, label: "Disetujui" },
            { status: "pending", count: pendingCount, label: "Menunggu" },
            { status: "needs_correction", count: needsCorrectionCount, label: "Perlu Perbaikan" },
        ]

        return NextResponse.json({
            kpi: {
                totalInspections,
                approvedCount,
                pendingCount,
                needsCorrectionCount,
                approvalRate,
                avgTurnaroundHours,
            },
            trends,
            topShippers,
            commodityDistribution,
            statusDistribution,
        })
    } catch (error) {
        console.error("[ANALYTICS_GET]", error)
        return apiError("Failed to calculate analytics", 500)
    }
}
