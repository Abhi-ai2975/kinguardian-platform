import z from "zod";

export const socialProviders = ["google", "github"] as const;
export type TSocialProviders = (typeof socialProviders)[number];
export const ZodSocialProviders = z.enum(socialProviders);
