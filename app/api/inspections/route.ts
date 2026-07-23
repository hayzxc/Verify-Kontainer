import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifySession } from "@/lib/auth"
import { InspectionSchema, PaginationSchema } from "@/lib/validations"
import { notifyAdmins } from "@/lib/notification-helpers"

export async function GET(req: Request) {
    try {
        const session = await verifySession()
        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const page = parseInt(searchParams.get("page") || "1")
        const limit = parseInt(searchParams.get("limit") || "20")

        // Filter parameters
        const search = searchParams.get("search") || ""
        const status = searchParams.get("status") || ""
        const commodityType = searchParams.get("commodityType") || ""
        const createdBy = searchParams.get("createdBy") || ""
        const dateFrom = searchParams.get("dateFrom") || ""
        const dateTo = searchParams.get("dateTo") || ""

        // Validate pagination params
        const paginationResult = PaginationSchema.safeParse({ page, limit })
        if (!paginationResult.success) {
            return new NextResponse("Invalid pagination parameters", { status: 400 })
        }

        const { page: validPage, limit: validLimit } = paginationResult.data
        const skip = (validPage - 1) * validLimit

        // Build dynamic where clause
        const where: Prisma.InspectionWhereInput = {}

        // Text search on shipper name or container number
        if (search) {
            where.OR = [
                { shipperName: { contains: search, mode: "insensitive" } },
                { containerNumber: { contains: search, mode: "insensitive" } },
            ]
        }

        // Status filter
        if (status) {
            where.status = status
        }

        // Commodity type filter
        if (commodityType) {
            where.commodityType = commodityType
        }

        // Created by filter (verificator name)
        if (createdBy) {
            where.createdBy = createdBy
        }

        // Date range filter
        if (dateFrom || dateTo) {
            where.createdAt = {}
            if (dateFrom) {
                where.createdAt.gte = new Date(dateFrom)
            }
            if (dateTo) {
                // Add 1 day to include the end date fully
                const endDate = new Date(dateTo)
                endDate.setDate(endDate.getDate() + 1)
                where.createdAt.lte = endDate
            }
        }

        // Execute count and findMany in parallel via a single database transaction
        const [total, inspections] = await db.$transaction([
            db.inspection.count({ where }),
            db.inspection.findMany({
                where,
                orderBy: {
                    createdAt: "desc",
                },
                skip,
                take: validLimit,
                select: {
                    id: true,
                    shipperName: true,
                    commodityType: true,
                    containerNumber: true,
                    status: true,
                    createdAt: true,
                    location: true,
                    adminNotes: true,
                    createdBy: true,
                    notes: true,
                }
            })
        ])

        return NextResponse.json({
            data: inspections,
            metadata: {
                total,
                page: validPage,
                limit: validLimit,
                totalPages: Math.ceil(total / validLimit)
            }
        })
    } catch (error) {
        console.error("[INSPECTIONS_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await verifySession()
        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const body = await req.json()

        // Zod Validation
        const result = InspectionSchema.safeParse(body)
        if (!result.success) {
            return new NextResponse(result.error.errors[0].message, { status: 400 })
        }

        const {
            shipperName,
            commodityType,
            containerNumber,
            photos,
            location,
            notes,
            stackingDescription,
            slicingDescription,
            createdBy,
        } = result.data

        const inspection = await db.inspection.create({
            data: {
                shipperName,
                commodityType,
                containerNumber,
                notes,
                stackingDescription,
                moistureDescription: slicingDescription, // mapped: frontend uses slicingDescription, DB column is moistureDescription
                status: "pending",
                createdBy: createdBy || "Unknown User",
                location: location || {},
                photos: {
                    ...photos,
                }
            },
        })

        // Notify all admins about new inspection
        await notifyAdmins(
            "inspection_submitted",
            "Inspeksi Baru",
            `Inspeksi baru dari ${createdBy || "Unknown User"} untuk ${shipperName}`,
            inspection.id
        )

        return NextResponse.json(inspection)
    } catch (error) {
        console.error("[INSPECTIONS_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

