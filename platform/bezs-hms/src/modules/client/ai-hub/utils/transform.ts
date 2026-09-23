/**
 * Universal declarative data-transform engine.
 *
 * Consumed two ways:
 *   1. Directly via `applyTransform(data, spec)` anywhere in TypeScript.
 *   2. Via the `$transform` directive inside UI-schema JSON, resolved by
 *      `mapUiSchemaDataV3.mapDataToUI` before components ever see the data.
 *
 * Every transform receives an array (or a single value that is wrapped into
 * a one-element array) and returns either a new array or a scalar value
 * (`extract` and un-grouped `aggregate`).
 *
 * Compose complex transformations with `chain`:
 *
 *   { "$transform": {
 *       "from": "$vitals.data",
 *       "type": "chain",
 *       "steps": [
 *         { "type": "filter",  "field": "heart_rate", "op": "notNull" },
 *         { "type": "slice",   "sort": "date", "order": "asc" },
 *         { "type": "map",     "fields": { "label": "date", "hr": "heart_rate" } }
 *       ]
 *     }
 *   }
 */

// ── Aggregation operations ────────────────────────────────────────────────────

export type AggOp = "sum" | "avg" | "min" | "max" | "count" | "first" | "last";

// ── Transform spec types ──────────────────────────────────────────────────────

/**
 * map — rename / pick / format fields from each record.
 * Each key in `fields` is the output key name.
 * Value is either a source field path string, or an object with `from`+`format`.
 *
 * Example:
 *   { type:"map", fields:{ label:"date", hr:"heart_rate", bmi:{ from:"weight_kg", format:"round" } } }
 */
export interface MapSpec {
  type: "map";
  fields: Record<
    string,
    string | { from: string; format?: "date" | "round" | "percent" | "number" | "string" }
  >;
}

/**
 * pivot — turn one record's multiple fields into [{label, value, color?}] for pie/donut charts.
 * `source` controls which record is used when there are multiple (default "last").
 * `fields` maps display label → source field path.
 *
 * Example:
 *   { type:"pivot", source:"last",
 *     fields:{ "Deep Sleep":"deep_sleep_minutes", "REM":"rem_sleep_minutes" },
 *     excludeNull:true }
 */
export interface PivotSpec {
  type: "pivot";
  source?: "first" | "last" | AggOp;
  fields: Record<string, string>;
  colorMap?: Record<string, string>;
  excludeNull?: boolean;
  excludeZero?: boolean;
}

/**
 * aggregate — collapse an array into a single record (or grouped records).
 * Without `groupBy` returns a plain object (scalar context, e.g. a KPI value).
 * With `groupBy` returns an array of grouped+aggregated records.
 *
 * Example (grouped):
 *   { type:"aggregate", groupBy:"activity_name", labelField:"label",
 *     fields:{ steps:"sum", calories_kcal:"sum" } }
 */
export interface AggregateSpec {
  type: "aggregate";
  fields: Record<string, AggOp>;
  groupBy?: string;
  labelField?: string;
}

/**
 * slice — sort and/or limit the array.
 *
 * Example:
 *   { type:"slice", sort:"date", order:"asc", limit:30 }
 */
export interface SliceSpec {
  type: "slice";
  sort?: string;
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

/**
 * filter — keep only records matching a condition.
 *
 * Example:
 *   { type:"filter", field:"heart_rate", op:"notNull" }
 *   { type:"filter", field:"gender", op:"eq", value:"male" }
 */
export interface FilterSpec {
  type: "filter";
  field: string;
  op: "eq" | "ne" | "gt" | "lt" | "gte" | "lte" | "notNull" | "isNull" | "contains";
  value?: any;
}

/**
 * extract — pull a single scalar value out of the (already sliced/filtered) array.
 * Always terminates a chain; the result is a plain value, not an array.
 *
 * Example:
 *   { type:"extract", field:"heart_rate", fallback:"N/A" }
 */
export interface ExtractSpec {
  type: "extract";
  field: string;
  fallback?: string | number | null;
}

/**
 * chain — apply multiple transforms in sequence.
 * Each step receives the output of the previous step.
 *
 * Example:
 *   { type:"chain", steps:[
 *       { type:"filter", field:"steps", op:"notNull" },
 *       { type:"slice",  sort:"date",   order:"asc" },
 *       { type:"map",    fields:{ label:"date", steps:"steps" } }
 *     ] }
 */
export interface ChainSpec {
  type: "chain";
  steps: TransformSpec[];
}

export type TransformSpec =
  | MapSpec
  | PivotSpec
  | AggregateSpec
  | SliceSpec
  | FilterSpec
  | ExtractSpec
  | ChainSpec;

// ── Internal helpers ──────────────────────────────────────────────────────────

function getAt(obj: any, path: string): any {
  if (!path) return obj;
  return path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .reduce((o, k) => o?.[k], obj);
}

function applyFormat(val: any, format?: string): any {
  if (val == null) return val;
  switch (format) {
    case "date":
      return typeof val === "string" ? val.slice(0, 10) : new Date(val).toLocaleDateString();
    case "round":
      return Math.round(Number(val));
    case "percent":
      return `${val}%`;
    case "number":
      return Number(val);
    case "string":
      return String(val);
    default:
      return val;
  }
}

function computeAgg(values: any[], op: AggOp): any {
  const nums = values.filter((v) => v != null && v !== "" && !isNaN(Number(v))).map(Number);
  switch (op) {
    case "sum":   return nums.reduce((a, b) => a + b, 0);
    case "avg":   return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
    case "min":   return nums.length ? Math.min(...nums) : null;
    case "max":   return nums.length ? Math.max(...nums) : null;
    case "count": return values.length;
    case "first": return values.find((v) => v != null) ?? null;
    case "last":  return [...values].reverse().find((v) => v != null) ?? null;
    default:      return null;
  }
}

// ── Transform implementations ─────────────────────────────────────────────────

function runMap(data: any[], spec: MapSpec): any[] {
  return data.map((record) => {
    const out: Record<string, any> = {};
    for (const [outKey, fieldSpec] of Object.entries(spec.fields)) {
      if (typeof fieldSpec === "string") {
        out[outKey] = getAt(record, fieldSpec);
      } else {
        out[outKey] = applyFormat(getAt(record, fieldSpec.from), fieldSpec.format);
      }
    }
    return out;
  });
}

function runPivot(
  data: any[],
  spec: PivotSpec,
): Array<{ label: string; value: number; color?: string }> {
  if (data.length === 0) return [];

  const src = spec.source ?? "last";
  let record: any;

  if (src === "first") {
    record = data[0];
  } else if (src === "last") {
    record = data[data.length - 1];
  } else {
    // aggregate all records into a single pseudo-record for each pivot field
    record = Object.fromEntries(
      Object.values(spec.fields).map((f) => [
        f,
        computeAgg(data.map((r) => getAt(r, f)), src as AggOp),
      ]),
    );
  }

  if (!record) return [];

  return Object.entries(spec.fields)
    .map(([label, fieldName]) => {
      const value = getAt(record, fieldName);
      if (spec.excludeNull && value == null) return null;
      if (spec.excludeZero && !value) return null;
      return {
        label,
        value: Number(value) || 0,
        ...(spec.colorMap?.[label] ? { color: spec.colorMap[label] } : {}),
      };
    })
    .filter((x): x is { label: string; value: number; color?: string } => x !== null);
}

function runAggregate(data: any[], spec: AggregateSpec): any[] | Record<string, any> {
  if (spec.groupBy) {
    const groups = new Map<string, any[]>();
    for (const record of data) {
      const key = String(getAt(record, spec.groupBy) ?? "");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(record);
    }
    return Array.from(groups.entries()).map(([groupKey, records]) => {
      const out: Record<string, any> = {
        [spec.labelField ?? spec.groupBy!]: groupKey,
      };
      for (const [field, op] of Object.entries(spec.fields)) {
        out[field] = computeAgg(records.map((r) => getAt(r, field)), op);
      }
      return out;
    });
  }

  const out: Record<string, any> = {};
  for (const [field, op] of Object.entries(spec.fields)) {
    out[field] = computeAgg(data.map((r) => getAt(r, field)), op);
  }
  return out;
}

function runSlice(data: any[], spec: SliceSpec): any[] {
  let result = [...data];
  if (spec.sort) {
    const field = spec.sort;
    const dir = spec.order === "desc" ? -1 : 1;
    result.sort((a, b) => {
      const av = getAt(a, field);
      const bv = getAt(b, field);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  }
  if (spec.offset) result = result.slice(spec.offset);
  if (spec.limit != null) result = result.slice(0, spec.limit);
  return result;
}

function runFilter(data: any[], spec: FilterSpec): any[] {
  return data.filter((record) => {
    const val = getAt(record, spec.field);
    switch (spec.op) {
      case "notNull":  return val != null && val !== "";
      case "isNull":   return val == null || val === "";
      case "eq":       return val === spec.value;
      case "ne":       return val !== spec.value;
      case "gt":       return Number(val) > Number(spec.value);
      case "lt":       return Number(val) < Number(spec.value);
      case "gte":      return Number(val) >= Number(spec.value);
      case "lte":      return Number(val) <= Number(spec.value);
      case "contains": return String(val ?? "").toLowerCase().includes(String(spec.value ?? "").toLowerCase());
      default:         return true;
    }
  });
}

function runExtract(data: any[], spec: ExtractSpec): any {
  const record = data[0];
  if (record == null) return spec.fallback ?? null;
  const val = getAt(record, spec.field);
  return val ?? spec.fallback ?? null;
}

function runChain(data: any[], spec: ChainSpec): any {
  return spec.steps.reduce((acc: any, step) => applyTransform(acc, step), data);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Apply a transform spec to any data value.
 * Non-array input is wrapped in a one-element array before processing.
 * Returns an array, a scalar, or a plain object depending on the spec type.
 */
export function applyTransform(data: any, spec: TransformSpec): any {
  const arr: any[] = Array.isArray(data) ? data : data != null ? [data] : [];
  switch (spec.type) {
    case "map":       return runMap(arr, spec);
    case "pivot":     return runPivot(arr, spec);
    case "aggregate": return runAggregate(arr, spec);
    case "slice":     return runSlice(arr, spec);
    case "filter":    return runFilter(arr, spec);
    case "extract":   return runExtract(arr, spec);
    case "chain":     return runChain(arr, spec);
    default:          return arr;
  }
}
