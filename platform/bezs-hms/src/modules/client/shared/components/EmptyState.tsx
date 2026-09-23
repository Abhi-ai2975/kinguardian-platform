"use client";

import { AlertCircle, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ZSAError } from "zsa";
import { useRouter } from "@/i18n/navigation";

interface EmptyDataProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonIcon?: React.ReactNode;
  buttonLabel?: string;
  buttonOnClick?: () => void;
  error?: ZSAError | null;
  ButtonEle?: React.ElementType | null;
}

export function EmptyState(props: EmptyDataProps) {
  const router = useRouter();
  const { error } = props;

  return (
    <Empty className="border-2 border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {error ? <AlertCircle className="text-red-400" /> : props.icon}
        </EmptyMedia>
        <EmptyTitle>{error ? "An Error Occurred!" : props.title}</EmptyTitle>
        <EmptyDescription>
          {error ? error.message : props.description}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {error ? (
          <Button
            onClick={() => {
              router.refresh();
            }}
          >
            <RefreshCw />
            Reload
          </Button>
        ) : props.ButtonEle ? (
          <props.ButtonEle />
        ) : (
          props.buttonLabel && (
            <Button
              onClick={() => {
                if (props.buttonOnClick) {
                  props.buttonOnClick();
                }
              }}
            >
              {props.buttonIcon ?? <Plus />}
              {props.buttonLabel ?? "Action"}
            </Button>
          )
        )}
      </EmptyContent>
    </Empty>
  );
}
