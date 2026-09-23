import z from "zod";

export const BaseSigninOrSignupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, and underscores"),
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean(),
});
