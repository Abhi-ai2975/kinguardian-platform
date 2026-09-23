"use client";

import { useDynamicComponent } from "../hooks/use-dynamic-component";

import { useEffect, useRef, useState } from "react";
import {
  isEmpty,
  isNil,
  cloneDeep,
  uniq,
  sortBy,
  omit,
  isNumber,
} from "lodash";
import { TopLevelSpec, compile } from "vega-lite";
import embed, { EmbedOptions, Result } from "vega-embed";

// Chart handler based on chart/handler.ts
enum MarkType {
  ARC = "arc",
  AREA = "area",
  BAR = "bar",
  BOXPLOT = "boxplot",
  CIRCLE = "circle",
  ERRORBAND = "errorband",
  ERRORBAR = "errorbar",
  IMAGE = "image",
  LINE = "line",
  POINT = "point",
  RECT = "rect",
  RULE = "rule",
  SQUARE = "square",
  TEXT = "text",
  TICK = "tick",
  TRAIL = "trail",
}

const COLOR = {
  GRAY_10: "#262626",
  GRAY_9: "#434343",
  GRAY_8: "#65676c",
  GRAY_5: "#d9d9d9",
};

// Default color scheme
const colorScheme = [
  "#7763CF",
  "#444CE7",
  "#1570EF",
  "#0086C9",
  "#3E4784",
  "#E31B54",
  "#EC4A0A",
  "#EF8D0C",
  "#EBC405",
  "#5381AD",
];

// high contrast color scheme
const pickedColorScheme = [
  colorScheme[4],
  colorScheme[5],
  colorScheme[8],
  colorScheme[3],
  colorScheme[0],
];

const DEFAULT_COLOR = colorScheme[2];

type DataSpec = { values: Record<string, any>[] };
type EncodingSpec = Extract<TopLevelSpec, { encoding?: any }>["encoding"] & {
  [key: string]: any;
};
type MarkSpec = Extract<TopLevelSpec, { mark?: any }>["mark"] extends
  | string
  | infer M
  ? M
  : never;
type AutosizeSpec = Extract<TopLevelSpec, { autosize?: any }>["autosize"];
type ParamsSpec = {
  name: string;
  select: {
    type: string;
    fields?: string[];
    on: string;
    clear: string;
  };
  value?: any;
}[];
type TransformSpec = Extract<TopLevelSpec, { transform?: any }>["transform"];

type ChartOptions = {
  width?: number | string;
  height?: number | string;
  stack?: "zero" | "normalize";
  point?: boolean;
  donutInner?: number | false;
  categoriesLimit?: number;
  isShowTopCategories?: boolean;
  isHideLegend?: boolean;
  isHideTitle?: boolean;
};

const config = {
  mark: { tooltip: true },
  font: "Roboto, Arial, Noto Sans, sans-serif",
  padding: {
    top: 30,
    bottom: 20,
    left: 0,
    right: 0,
  },
  title: {
    color: COLOR.GRAY_10,
    fontSize: 14,
  },
  axis: {
    labelPadding: 0,
    labelOffset: 0,
    labelFontSize: 10,
    gridColor: COLOR.GRAY_5,
    titleColor: COLOR.GRAY_9,
    labelColor: COLOR.GRAY_8,
    labelFont: " Roboto, Arial, Noto Sans, sans-serif",
  },
  axisX: { labelAngle: -45 },
  line: {
    color: DEFAULT_COLOR,
  },
  bar: {
    color: DEFAULT_COLOR,
  },
  legend: {
    symbolLimit: 15,
    columns: 1,
    labelFontSize: 10,
    labelColor: COLOR.GRAY_8,
    titleColor: COLOR.GRAY_9,
    titleFontSize: 14,
  },
  range: {
    category: colorScheme,
    ordinal: colorScheme,
    diverging: colorScheme,
    symbol: colorScheme,
    heatmap: colorScheme,
    ramp: colorScheme,
  },
  point: { size: 60, color: DEFAULT_COLOR },
};

function createChartSpecHandler(spec: TopLevelSpec, options?: ChartOptions) {
  const handler = {
    config,
    options: {
      width: isNil(options?.width) ? "container" : options.width,
      height: isNil(options?.height) ? "container" : options.height,
      stack: isNil(options?.stack) ? "zero" : options.stack,
      point: isNil(options?.point) ? true : options.point,
      donutInner: isNil(options?.donutInner) ? 60 : (options?.donutInner ?? 60),
      categoriesLimit: isNil(options?.categoriesLimit)
        ? 25
        : options.categoriesLimit,
      isShowTopCategories: isNil(options?.isShowTopCategories)
        ? false
        : options.isShowTopCategories,
      isHideLegend: isNil(options?.isHideLegend) ? false : options.isHideLegend,
      isHideTitle: isNil(options?.isHideTitle) ? false : options.isHideTitle,
    },
    $schema: spec.$schema,
    title: spec.title as string,
    data: spec.data as DataSpec,
    encoding: {} as EncodingSpec,
    mark: {} as MarkSpec,
    autosize: { type: "fit", contains: "padding" },
    params: [
      {
        name: "hover",
        select: {
          type: "point",
          on: "mouseover",
          clear: "mouseout",
        },
      },
    ],
    transform: spec.transform,
  };

  // avoid mutating the original spec
  const clonedSpec = cloneDeep(spec);

  // Breaks the Spec into Pieces
  parseSpec(handler, clonedSpec);

  return {
    getChartSpec: () => getChartSpec(handler),
    config: handler.config,
  };
}

function parseSpec(handler: any, spec: TopLevelSpec) {
  handler.$schema = spec.$schema;
  handler.title = spec.title as string;
  handler.transform = spec.transform;

  if ("mark" in spec) {
    const mark =
      typeof spec.mark === "string" ? { type: spec.mark } : spec.mark;
    addMark(handler, mark);
  }

  if ("encoding" in spec) {
    // filter top categories before encoding scale calculation
    if (handler.options?.isShowTopCategories) {
      const filteredData = filterTopCategories(
        handler,
        spec.encoding as EncodingSpec,
      );
      if (filteredData) handler.data = filteredData;
    }

    addEncoding(handler, spec.encoding as EncodingSpec);
  }
}

function addMark(handler: any, mark: MarkSpec) {
  let additionalProps = {};

  if (mark.type === MarkType.LINE) {
    additionalProps = { point: handler.options.point, tooltip: true };
  } else if (mark.type === MarkType.ARC) {
    additionalProps = { innerRadius: handler.options.donutInner };
  }
  handler.mark = { type: mark.type, ...additionalProps };
}

function addEncoding(handler: any, encoding: EncodingSpec) {
  handler.encoding = encoding;

  // fill color by x field if AI not provide color(category) field
  if (isNil(handler.encoding.color)) {
    // find the nominal axis
    const nominalAxis = ["x", "y"].find(
      (axis) => encoding[axis]?.type === "nominal",
    );
    if (nominalAxis) {
      const category = encoding[nominalAxis] as any;
      handler.encoding.color = {
        field: category.field,
        type: category.type,
      };
    }
  }

  // handle scale on bar chart
  if (handler.mark.type === MarkType.BAR) {
    if ("stack" in handler.encoding.y) {
      handler.encoding.y.stack = handler.options.stack;
    }

    if ("xOffset" in handler.encoding) {
      const xOffset = handler.encoding.xOffset as any;
      let title = xOffset?.title;
      // find xOffset title if not provided
      if (!title) {
        title = findFieldTitleInEncoding(handler.encoding, xOffset?.field);
      }
      handler.encoding.xOffset = { ...xOffset, title };
    }
  }

  addHoverHighlight(handler, handler.encoding);
}

function addHoverHighlight(handler: any, encoding: EncodingSpec) {
  const category = (
    encoding.color?.condition ? encoding.color.condition : encoding.color
  ) as { type: any; field: string; title?: string };
  if (!category?.field || !category?.type) return;

  // Define the hover parameter correctly
  if (handler.params && category?.field) {
    handler.params[0].select.fields = [category.field];
  }

  handler.encoding.opacity = {
    condition: {
      param: "hover",
      value: 1,
    },
    value: 0.3,
  };

  let title = category?.title;
  // find color title if not provided
  if (!title) {
    title = findFieldTitleInEncoding(handler.encoding, category?.field);
  }

  // basic color properties
  const colorProperties = {
    title,
    field: category?.field,
    type: category?.type,
    scale: {
      range: colorScheme,
    },
  } as any;

  handler.encoding.color = {
    ...colorProperties,
    condition: {
      param: "hover",
      ...omit(colorProperties, "scale"),
    } as any,
  };
}

function filterTopCategories(handler: any, encoding: EncodingSpec) {
  const nominalKeys = ["xOffset", "color", "x", "y"].filter(
    (axis) => encoding[axis]?.type === "nominal",
  );
  const quantitativeKeys = ["theta", "x", "y"].filter(
    (axis) => encoding[axis]?.type === "quantitative",
  );
  if (!nominalKeys.length || !quantitativeKeys.length) return;

  const clonedValues = cloneDeep((handler.data as any).values);

  const quantitativeAxis = quantitativeKeys[0];
  const quanAxis = encoding[quantitativeAxis] as any;
  const sortedValues = sortBy(clonedValues, (val) => {
    const value = val[quanAxis.field];
    return isNumber(value) ? -value : 0;
  });

  // nominal values probably have different length, so we need to filter them
  const filteredNominals: Array<{ field: string; values: any[] }> = [];
  for (const nominalKey of nominalKeys) {
    const nomiAxis = encoding[nominalKey] as any;
    if (filteredNominals.some((val) => val.field === nomiAxis.field)) {
      continue;
    }
    const nominalValues = sortedValues.map((val) => val[nomiAxis.field]);
    const uniqueNominalValues = uniq(nominalValues);
    const topNominalValues = uniqueNominalValues.slice(
      0,
      handler.options.categoriesLimit,
    );
    filteredNominals.push({
      field: nomiAxis.field,
      values: topNominalValues,
    });
  }
  const values = clonedValues.filter((val: any) =>
    filteredNominals.every((nominal) =>
      nominal.values.includes(val[nominal.field]),
    ),
  );
  return { values };
}

function getAllCategories(handler: any, encoding: EncodingSpec) {
  const nominalAxis = ["xOffset", "color", "x", "y"].find(
    (axis) => encoding[axis]?.type === "nominal",
  );
  if (!nominalAxis) return [];
  const axisKey = encoding[nominalAxis] as any;
  const values = (handler.data as any).values;
  const categoryValues = values.map((val: any) => val[axisKey.field]);
  const uniqueCategoryValues = uniq(categoryValues);

  return uniqueCategoryValues;
}

function findFieldTitleInEncoding(encoding: EncodingSpec, field: string) {
  const axis = ["x", "y", "xOffset", "color"].find(
    (axis) => encoding[axis]?.field === field && encoding[axis]?.title,
  ) as any;
  return encoding[axis]?.title || undefined;
}

function transformDataValues(
  data: DataSpec,
  encoding: {
    x?: { type?: string; field?: string };
    y?: { type?: string; field?: string };
  },
) {
  // If axis x is temporal
  if (encoding?.x?.type === "temporal" && encoding?.x?.field) {
    const transformedValues = data.values.map((val: any) => ({
      ...val,
      [encoding.x!.field!]: transformTemporalValue(val[encoding.x!.field!]),
    }));
    return { ...data, values: transformedValues };
  }
  // If axis y is temporal
  if (encoding?.y?.type === "temporal" && encoding?.y?.field) {
    const transformedValues = data.values.map((val: any) => ({
      ...val,
      [encoding.y!.field!]: transformTemporalValue(val[encoding.y!.field!]),
    }));
    return { ...data, values: transformedValues };
  }
  return data;
}

function transformTemporalValue(value: string | any) {
  if (value === null || value === undefined) {
    return value;
  }
  const strValue = typeof value === "string" ? value : String(value);
  // Safari not support if containing "YYYY-MM-DD HH:mm:ss.SSS UTC+00:00"
  // so we remove the UTC+00:00 for compatibility
  if (strValue.includes("UTC")) {
    return strValue.replace(/\s+UTC([+-][0-9]+)?(:[0-9]+)?/, "");
  }
  return strValue;
}

function getChartSpec(handler: any) {
  const categories = getAllCategories(handler, handler.encoding);
  // chart not support if categories more than the categories limit
  if (categories.length > handler.options.categoriesLimit) {
    return null;
  }

  // if categories less or equal 5, use the picked color
  if (categories.length <= 5) {
    // Set the contrast color range on the color encoding instead of x/xOffset
    handler.encoding.color = {
      ...handler.encoding.color,
      scale: {
        range: pickedColorScheme,
      },
    } as any;
  }

  if (handler.options.isHideLegend) {
    handler.encoding.color = {
      ...handler.encoding.color,
      legend: null,
    } as any;
  }

  if (handler.options.isHideTitle) {
    handler.title = null;
  }

  // transform values
  handler.data = transformDataValues(handler.data, handler.encoding);

  return {
    $schema: handler.$schema,
    title: handler.title,
    data: handler.data,
    mark: handler.mark,
    width: handler.options.width,
    height: handler.options.height,
    autosize: handler.autosize,
    encoding: handler.encoding,
    params: handler.params,
    transform: handler.transform,
  } as TopLevelSpec;
}

const embedOptions: EmbedOptions = {
  mode: "vega-lite",
  renderer: "svg",
  tooltip: { theme: "custom" },
  actions: {
    export: true,
    editor: false,
  },
};

interface ChartProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  spec?: TopLevelSpec;
  values?: Record<string, any>[];
  autoFilter?: boolean;
  hideActions?: boolean;
  hideTitle?: boolean;
  hideLegend?: boolean;
  forceUpdate?: number;
  isPinned?: boolean;
  onReload?: () => void;
  onEdit?: () => void;
  onPin?: () => void;
  processor?: any;
  surfaceId?: string;
  component?: any;
  weight?: string | number;
}

function Chart(props: ChartProps) {
  const {
    className = "",
    processor,
    surfaceId,
    component,
    weight,
    spec,
    values,
    width = "100%",
    height = 320,
    autoFilter,
    hideActions,
    hideTitle,
    hideLegend,
    forceUpdate,
    isPinned,
    onReload,
    onEdit,
    onPin,
  } = props;

  // Convert any non-plain objects (like Sets) to plain objects
  const safeSpec = spec ? JSON.parse(JSON.stringify(spec)) : null;
  const safeValues = values ? JSON.parse(JSON.stringify(values)) : null;

  const { resolvePrimitive } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );

  console.log(values);

  const [donutInner, setDonutInner] = useState<number | false | undefined>(60);
  const [parsedSpec, setParsedSpec] = useState<
    ReturnType<typeof compile>["spec"] | null
  >(null);
  const [parsedError, setParsedError] = useState<Record<string, any> | null>(
    null,
  );
  const [isShowTopCategories, setIsShowTopCategories] = useState(false);
  const $view = useRef<Result>(null);
  const $container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cSpec = resolvePrimitive(component?.properties?.spec) ?? spec;
    const cValues = resolvePrimitive(component?.properties?.values) ?? values;
    const cAutoFilter =
      resolvePrimitive(component?.properties?.autoFilter) ?? autoFilter;
    const cHideActions =
      resolvePrimitive(component?.properties?.hideActions) ?? hideActions;
    const cHideTitle =
      resolvePrimitive(component?.properties?.hideTitle) ?? hideTitle;
    const cHideLegend =
      resolvePrimitive(component?.properties?.hideLegend) ?? hideLegend;

    console.log(cValues);

    if (!cSpec || !cValues) return;
    try {
      const specHandler = createChartSpecHandler(
        {
          ...cSpec,
          data: { values: cValues },
        },
        {
          donutInner,
          isShowTopCategories: cAutoFilter || isShowTopCategories,
          isHideLegend: cHideLegend,
          isHideTitle: cHideTitle,
        },
      );
      const chartSpec = specHandler.getChartSpec();
      const isDataEmpty = isEmpty((chartSpec?.data as any)?.values);
      if (isDataEmpty) {
        setTimeout(() => setParsedSpec(null), 0);
      } else if (chartSpec) {
        const compiled = compile(chartSpec, { config: specHandler.config });
        setTimeout(() => setParsedSpec(compiled.spec), 0);
      }
    } catch (error: any) {
      console.error(error);
      setTimeout(() => {
        setParsedError({
          code: "CLIENT_PARSE_ERROR",
          shortMessage: "Failed to render chart visualization",
          message: error?.message,
          stacktrace: error?.stack?.split("\n") || [],
        });
      }, 0);
    }
    return () => {
      setParsedSpec(null);
      setParsedError(null);
    };
  }, [spec, values, isShowTopCategories, donutInner, forceUpdate]);

  // initial vega view
  useEffect(() => {
    if ($container.current && parsedSpec) {
      embed($container.current, parsedSpec, embedOptions).then((view) => {
        $view.current = view;
      });
    }
    return () => {
      if ($view.current) $view.current.finalize();
    };
  }, [parsedSpec, forceUpdate]);

  useEffect(() => {
    if ($container.current) {
      setDonutInner($container.current.clientHeight * 0.15);
    }
  }, [forceUpdate]);

  const onShowTopCategories = () => {
    setIsShowTopCategories(!isShowTopCategories);
  };

  const getChartContent = () => {
    const cValues = component?.properties?.values ?? values;
    if (!cValues || cValues.length === 0) return <div>No available data</div>;

    if (parsedError) {
      return (
        <div className="mx-4 mt-12" onMouseDown={(e) => e.stopPropagation()}>
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {parsedError.shortMessage}
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{parsedError.message}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (parsedSpec === null) {
      return (
        <div className="mt-12 mb-4 mx-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-yellow-800">
                    There are too many categories to display effectively. Click
                    &apos;Show top 25&apos; to view the top results, or ask a
                    follow-up question to focus on a specific group or filter
                    results.
                  </h3>
                  <button
                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                    onClick={onShowTopCategories}
                  >
                    <svg
                      className="mr-1 h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    Show top 25
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return <div style={{ width, height }} ref={$container} />;
  };

  const isAdditionalShow = !!onReload || !!onEdit || !!onPin;

  return (
    <div className={`w-full ${className}`} style={{ width }}>
      {isAdditionalShow && (
        <div className="flex justify-between items-center">
          {!!onReload && (
            <button
              onClick={onReload}
              className="text-gray-500 hover:text-gray-700 p-1 rounded"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          )}
          {!!onEdit && (
            <button
              onClick={onEdit}
              className="text-gray-500 hover:text-gray-700 p-1 rounded"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          )}
          {!!onPin && (
            <button
              onClick={onPin}
              className="text-gray-500 hover:text-gray-700 p-1 rounded"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </button>
          )}
        </div>
      )}
      {getChartContent()}
    </div>
  );
}

export default Chart;
