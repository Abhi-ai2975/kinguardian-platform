/**
 * Message processor — the event bus and data store shared across a chat session.
 *
 * One instance is created by A2UIChat and passed as `processor` prop to every
 * <Renderer> and catalog component.
 *
 * Two responsibilities:
 *
 *   1. Data model — per-surface key-value store for server-driven rendering
 *      (the legacy push mode where the server sends component updates over SSE).
 *      In workflow mode this store stays empty; all data comes pre-resolved
 *      through mapDataToUI before components render.
 *
 *   2. Dispatch bridge — when a Form fires sendAction(), it calls
 *      processor.dispatch(message) which emits a "dispatch" event.
 *      A2UIChat listens for this event, calls /api/workflow/submit, then
 *      resolves the Promise returned by dispatch() so the Form component
 *      knows the submission completed.
 */
import type {
  AnyComponentNode,
  ServerToClientMessage,
  A2UIClientEventMessage,
  DataValue,
} from "../types";

export interface IMessageProcessor {
  getSurfaces(): Record<string, Surface>;
  clearSurfaces(): void;
  processMessages(messages: ServerToClientMessage[]): void;
  getData(
    node: AnyComponentNode,
    relativePath: string,
    surfaceId: string | undefined,
  ): DataValue | null;
  setData(
    node: AnyComponentNode | null,
    relativePath: string,
    value: DataValue,
    surfaceId: string | undefined,
  ): void;
  resolvePath(path: string, dataContextPath?: string): string;
  dispatch(message: A2UIClientEventMessage): Promise<ServerToClientMessage[]>;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

export interface Surface {
  rootComponentId: string;
  components: Record<string, any>;
  dataModel: Record<string, DataValue>;
  styles: Record<string, string>;
}

export function createMessageProcessor(): IMessageProcessor {
  const surfaces: Record<string, Surface> = {};
  const eventListeners: Record<string, EventListener[]> = {};

  const updateDataModel = (
    dataModel: Record<string, DataValue>,
    basePath: string,
    contents: Array<{
      key: string;
      valueString?: string;
      valueNumber?: number;
      valueBoolean?: boolean;
      valueMap?: any[];
    }>,
  ): void => {
    const parts = basePath.split("/").filter(Boolean);
    let current: any = dataModel;

    for (const part of parts) {
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }

    for (const item of contents) {
      let value: DataValue;
      if (item.valueString !== undefined) {
        try {
          value = JSON.parse(item.valueString);
        } catch {
          value = item.valueString;
        }
      } else if (item.valueNumber !== undefined) {
        value = item.valueNumber;
      } else if (item.valueBoolean !== undefined) {
        value = item.valueBoolean;
      } else if (item.valueMap) {
        const map: Record<string, DataValue> = {};
        updateDataModel(map, "", item.valueMap);
        value = map;
      } else {
        value = null;
      }

      current[item.key] = value;
    }
  };

  const getSurfaces = (): Record<string, Surface> => {
    return surfaces;
  };

  const clearSurfaces = (): void => {
    Object.keys(surfaces).forEach((key) => delete surfaces[key]);
  };

  const processMessages = (messages: ServerToClientMessage[]): void => {
    for (const message of messages) {
      if (message.beginRendering) {
        const { surfaceId, root, styles } = message.beginRendering;
        surfaces[surfaceId] = {
          rootComponentId: root,
          components: {},
          dataModel: {},
          styles: styles || {},
        };
      } else if (message.surfaceUpdate) {
        const { surfaceId, components } = message.surfaceUpdate;
        const surface = surfaces[surfaceId];
        if (surface) {
          for (const component of components) {
            surface.components[component.id] = component;
          }
        }
      } else if (message.dataModelUpdate) {
        const { surfaceId, path = "", contents } = message.dataModelUpdate;
        const surface = surfaces[surfaceId];
        if (surface) {
          updateDataModel(surface.dataModel, path, contents);
        }
      } else if (message.deleteSurface) {
        delete surfaces[message.deleteSurface.surfaceId];
      }
    }
  };

  const getData = (
    node: AnyComponentNode,
    relativePath: string,
    surfaceId: string,
  ): DataValue | null => {
    const surface = surfaces[surfaceId];
    if (!surface) return null;

    const resolvedPath = resolvePath(relativePath, node.dataContextPath);
    const parts = resolvedPath.split("/").filter(Boolean);
    let current: any = surface.dataModel;

    for (const part of parts) {
      if (!current || !(part in current)) {
        return null;
      }
      current = current[part];
    }

    return current;
  };

  const setData = (
    node: AnyComponentNode | null,
    relativePath: string,
    value: DataValue,
    surfaceId: string,
  ): void => {
    const surface = surfaces[surfaceId];
    if (!surface) return;

    const resolvedPath = resolvePath(relativePath, node?.dataContextPath);
    const parts = resolvedPath.split("/").filter(Boolean);
    let current: any = surface.dataModel;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }

    const lastPart = parts[parts.length - 1];
    current[lastPart] = value;
  };

  const resolvePath = (path: string, dataContextPath?: string): string => {
    if (path.startsWith("/")) {
      return path;
    }
    return dataContextPath
      ? `${dataContextPath}/${path}`.replace(/\/+/g, "/")
      : path;
  };

  const dispatch = (
    message: A2UIClientEventMessage,
  ): Promise<ServerToClientMessage[]> => {
    return new Promise((resolve) => {
      const eventListenersForType = eventListeners["dispatch"] || [];
      eventListenersForType.forEach((listener) => {
        listener({
          detail: { message, resolve },
        } as any);
      });
    });
  };

  const addEventListener = (type: string, listener: EventListener): void => {
    if (!eventListeners[type]) {
      eventListeners[type] = [];
    }
    eventListeners[type].push(listener);
  };

  const removeEventListener = (type: string, listener: EventListener): void => {
    if (eventListeners[type]) {
      eventListeners[type] = eventListeners[type].filter((l) => l !== listener);
    }
  };

  return {
    getSurfaces,
    clearSurfaces,
    processMessages,
    getData,
    setData,
    resolvePath,
    dispatch,
    addEventListener,
    removeEventListener,
  };
}

export interface DispatchedEvent {
  message: A2UIClientEventMessage;
  completion: (messages: ServerToClientMessage[]) => void;
}
