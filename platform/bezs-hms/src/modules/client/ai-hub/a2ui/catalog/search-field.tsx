"use client";

import { useState, useMemo } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { SearchFieldNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface SearchFieldProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: SearchFieldNode;
  weight?: string | number;
}

export function SearchField({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: SearchFieldProps) {
  const { resolvePrimitive, sendAction } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );

  const initialText = useMemo(
    () => resolvePrimitive(component.properties.text) || "",
    [resolvePrimitive, component.properties.text],
  );
  const [text, setText] = useState(initialText);
  const label = useMemo(
    () => resolvePrimitive(component.properties.label),
    [resolvePrimitive, component.properties.label],
  );
  const placeholder = useMemo(
    () => resolvePrimitive(component.properties.placeholder) || "Search...",
    [resolvePrimitive, component.properties.placeholder],
  );

  const handleSearch = async () => {
    if (component.properties.action) {
      const actionWithQuery = {
        ...component.properties.action,
        context: [
          ...(component.properties.action.context || []),
          {
            key: "query",
            value: { literalString: text },
          },
        ],
      };
      await sendAction(actionWithQuery);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="space-y-2" style={{ flex: weight }}>
      {label && <Label htmlFor={component.id}>{label}</Label>}
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
        <Input
          id={component.id}
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-9 pr-9"
        />
        {text && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 h-7 w-7 p-0"
            onClick={() => setText("")}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
