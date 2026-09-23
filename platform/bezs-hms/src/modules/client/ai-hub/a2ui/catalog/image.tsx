import { useMemo } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { ImageNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";

interface ImageProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: ImageNode;
  weight?: string | number;
}

export function Image({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: ImageProps) {
  const { resolvePrimitive } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );

  const url = useMemo(
    () => resolvePrimitive(component.properties.url),
    [resolvePrimitive, component.properties.url],
  );
  const fit = component.properties.fit || "cover";
  const usageHint = component.properties.usageHint || "default";
  const altText = useMemo(
    () => resolvePrimitive(component.properties.altText) || "Image",
    [resolvePrimitive, component.properties.altText],
  );

  const styles = useMemo(() => {
    const objectFitMap: Record<string, string> = {
      cover: "object-cover",
      contain: "object-contain",
      fill: "object-fill",
      none: "object-none",
      scaleDown: "object-scale-down",
    };

    let sizeClass = "";
    switch (usageHint) {
      case "avatar":
        sizeClass = "w-12 h-12 rounded-full";
        break;
      case "icon":
        sizeClass = "w-6 h-6";
        break;
      case "smallFeature":
        sizeClass = "w-32 h-24";
        break;
      case "mediumFeature":
        sizeClass = "w-64 h-48";
        break;
      case "largeFeature":
        sizeClass = "w-full h-96";
        break;
      case "header":
        sizeClass = "w-full h-64";
        break;
      default:
        sizeClass = "w-full h-auto";
        break;
    }

    return `${objectFitMap[fit]} ${sizeClass}`;
  }, [fit, usageHint]);

  if (!url) {
    return null;
  }

  return (
    <img src={url} alt={altText} className={styles} style={{ flex: weight }} />
  );
}
