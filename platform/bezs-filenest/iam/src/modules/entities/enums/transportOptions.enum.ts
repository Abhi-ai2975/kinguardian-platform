import z from "zod";

export const RevalidateType = ["page", "layout"] as const;
export type TRevalidateType = (typeof RevalidateType)[number];
export const ZodERevalidateType = z.enum(RevalidateType);
