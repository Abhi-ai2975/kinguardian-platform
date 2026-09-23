"server-only";

import { appConfig } from "@/lib/appConfig";

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function validateCaptcha(token: string | undefined): Promise<void> {
  if (!appConfig.isCaptchaEnable) return;

  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) return;

  if (!token) {
    throw new Error("Please complete the captcha verification.");
  }

  const res = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: secretKey, response: token }),
  });

  const data = (await res.json()) as { success: boolean };
  if (!data.success) {
    throw new Error("Captcha verification failed. Please try again.");
  }
}
