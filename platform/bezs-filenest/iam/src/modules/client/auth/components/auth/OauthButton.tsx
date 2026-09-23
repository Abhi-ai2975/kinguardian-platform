"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { TSocialProviders } from "@/modules/entities/enums/auth/auth.enum";
import { useServerAction } from "zsa-react";
import { signinWithSocialAction } from "@/modules/server/presentation/actions/auth/auth.actions";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";
import { LastUsedBadge } from "@/components/LastedUsedBadge";

type Props = {
  oauthName: TSocialProviders;
  label: string;
  isFormSubmitting: boolean;
  className?: string;
  isLastUsed?: boolean;
};

const OauthButton = ({
  oauthName,
  label,
  isFormSubmitting,
  className,
  isLastUsed = false,
}: Props) => {
  const { execute, isPending } = useServerAction(signinWithSocialAction, {
    onError({ err }) {
      handleZSAError({
        err,
        fallbackMessage: "Failed to signin",
      });
    },
  });

  return (
    <div className="relative flex-1">
      {isLastUsed && <LastUsedBadge />}
      <Button
        variant="outline"
        disabled={isPending || isFormSubmitting}
        className={cn(
          "w-full items-center justify-center cursor-pointer border-2",
          className,
        )}
        onClick={async () => {
          const sp = new URLSearchParams(window.location.search);
          const isOAuthFlow =
            sp.has("client_id") && sp.has("redirect_uri");
          await execute({
            provider: oauthName,
            callbackURL: isOAuthFlow
              ? `/api/auth/oauth2/authorize?${sp.toString()}`
              : undefined,
          });
        }}
      >
        <span className="pointer-events-none">
          {!isPending ? (
            oauthName === "google" ? (
              <FcGoogle size={18} aria-hidden="true" />
            ) : (
              <FaGithub size={18} aria-hidden="true" />
            )
          ) : (
            <Loader2 className="animate-spin" />
          )}
        </span>
        {label}
      </Button>
    </div>
  );
};

export default OauthButton;
