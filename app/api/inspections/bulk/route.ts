import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifySession } from "@/lib/auth"
import { notifyAdmins } from "@/lib/notification-helpers"
import { z } from "zod"

const BulkInspectionSchema = z.object({
    shipperName: z.string().min(1, "Shipper name is required"),
    commodityType: z.string().min(1, "Commodity type is required"),
    containerNumbers: z.array(z.string().min(1)).min(1, "At least one container number is required"),
    notes: z.string().optional(),
    stackingDescription: z.string().optional(),
    slicingDescription: z.string().optional(),
    createdBy: z.string().optional(),
    location: z.any().optional(),
    photos: z.record(z.string(), z.any()).optional(),
})

export async function POST(req: Request) {
    try {
        const session = await verifySession()
        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const body = await req.json()

        const result = BulkInspectionSchema.safeParse(body)
        if (!result.success) {
            return new NextResponse(result.error.errors[0].message, { status: 400 })
        }

        const {
            shipperName,
            commodityType,
            containerNumbers,
            photos,
            location,
            notes,
            stackingDescription,
            slicingDescription,
            createdBy,
        } = result.data

        // Use $transaction with individual creates to get IDs for notifications
        const inspections = await db.$transaction(
            containerNumbers.map((num: string) =>
                db.inspection.create({
                    data: {
                        shipperName,
                        commodityType,
                        containerNumber: num,
                        notes,
                        stackingDescription,
                        moistureDescription: slicingDescription,
                        status: "pending",
                        createdBy: createdBy || "Unknown User",
                        location: location || {},
                        photos: {
                            ...photos,
                            containerNumber: null,
                        },
                    },
                })
            )
        )

        // Notify all admins about the bulk submission
        const inspectorName = createdBy || "Unknown User"
        for (const insp of inspections) {
            await notifyAdmins(
                "inspection_submitted",
                "Inspeksi Baru (Bulk)",
                `Inspeksi baru dari ${inspectorName} untuk ${shipperName} — ${insp.containerNumber}`,
                insp.id
            )
        }

        return NextResponse.json({ count: inspections.length, inspections })
    } catch (error) {
        console.error("[INSPECTIONS_BULK_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
