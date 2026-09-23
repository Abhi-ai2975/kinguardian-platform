"use client";

import { useEffect, useRef } from "react";
import { appConfig } from "@/lib/appConfig";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      reset: (widgetId: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

interface TurnstileProps {
  onToken: (token: string) => void;
  onExpire?: () => void;
}

export function Turnstile({ onToken, onExpire }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!appConfig.isCaptchaEnable || !SITE_KEY || !containerRef.current) return;

    const container = containerRef.current;

    function renderWidget() {
      if (!container || !window.turnstile) return;
      window.turnstile.render(container, {
        sitekey: SITE_KEY,
        callback: onToken,
        "expired-callback": () => onExpire?.(),
        theme: "auto",
      });
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      const SCRIPT_ID = "cf-turnstile-script";
      if (!document.getElementById(SCRIPT_ID)) {
        const script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js";
        script.async = true;
        script.defer = true;
        script.onload = renderWidget;
        document.head.appendChild(script);
      } else {
        const interval = setInterval(() => {
          if (window.turnstile) {
            clearInterval(interval);
            renderWidget();
          }
        }, 100);
        return () => clearInterval(interval);
      }
    }

    return () => {
      container.replaceChildren();
    };
  }, [onToken, onExpire]);

  if (!appConfig.isCaptchaEnable || !SITE_KEY) return null;

  return <div ref={containerRef} className="mt-1" />;
}
