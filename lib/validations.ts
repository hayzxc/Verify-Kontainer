import { z } from "zod";

export const SignupSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    name: z.string().min(1, "Name is required"),
    role: z.enum(["admin", "user", "verificator"], {
        errorMap: () => ({ message: "Invalid role. Must be admin, user, or verificator" }),
    }),
});

export const InspectionSchema = z.object({
    shipperName: z.string().min(1, "Shipper name is required"),
    commodityType: z.string().min(1, "Commodity type is required"),
    containerNumber: z.string().min(1, "Container number is required"),
    notes: z.string().optional(),
    stackingDescription: z.string().optional(),
    slicingDescription: z.string().optional(),
    createdBy: z.string().optional(), // Can be inferred from session, but kept for flexibility if needed
    location: z.any().optional(), // Using any for now as location structure can be complex, can be refined later
    photos: z.record(z.string(), z.any()).optional(), // Loose validation for photos map
});

export const PaginationSchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
});
