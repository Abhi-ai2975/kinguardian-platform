"use client";

import { useMemo } from "react";
import type {
  AnyComponentNode,
  A2UIClientEventMessage,
  ServerToClientMessage,
} from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import { DEFAULT_THEME } from "../theme";

let idCounter = 0;

export function useDynamicComponent(
  processor: IMessageProcessor,
  surfaceId: string | undefined,
  component: AnyComponentNode,
  weight: string | number = "initial",
) {
  const theme = DEFAULT_THEME;

  const sendAction = async (action: any): Promise<ServerToClientMessage[]> => {
    const context: Record<string, unknown> = {};

    if (action.context) {
      for (const item of action.context) {
        if (item.value.literalBoolean !== undefined) {
          context[item.key] = item.value.literalBoolean;
        } else if (item.value.literalNumber !== undefined) {
          context[item.key] = item.value.literalNumber;
        } else if (item.value.literalString !== undefined) {
          context[item.key] = item.value.literalString;
        } else if (item.value.literal !== undefined) {
          context[item.key] = item.value.literal;
        } else if (item.value.path) {
          const path = processor.resolvePath(
            item.value.path,
            component.dataContextPath,
          );
          const value = processor.getData(component, path, surfaceId);
          context[item.key] = value;
        }
      }
    }

    const message: A2UIClientEventMessage = {
      userAction: {
        name: action.name,
        sourceComponentId: component.id,
        surfaceId: surfaceId,
        timestamp: new Date().toISOString(),
        context,
      },
    };

    return processor.dispatch(message);
  };

  const resolvePrimitive = (value: any): any => {
    if (!value || typeof value !== "object") {
      return value;
    } else if (Array.isArray(value)) {
      return value.map(resolvePrimitive);
    } else if (value.literal !== undefined) {
      return value.literal;
    } else if (value.literalString !== undefined) {
      return value.literalString;
    } else if (value.literalNumber !== undefined) {
      return value.literalNumber;
    } else if (value.literalBoolean !== undefined) {
      return value.literalBoolean;
    } else if (value.path) {
      return processor.getData(component, value.path, surfaceId);
    }

    // Handle complex objects (e.g., spec for chart)
    const resolved: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      resolved[key] = resolvePrimitive(val);
    }
    return resolved;
  };

  const getUniqueId = (prefix: string) => {
    return `${prefix}-${idCounter++}`;
  };

  return useMemo(
    () => ({
      theme,
      sendAction,
      resolvePrimitive,
      getUniqueId,
    }),
    [processor, surfaceId, component, weight],
  );
}
