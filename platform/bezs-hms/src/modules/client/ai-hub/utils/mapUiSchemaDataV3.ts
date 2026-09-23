/**
 * mapUiSchemaDataV3 — declarative schema-to-component-tree resolver.
 *
 * Takes a raw UI schema JSON object and a data object (stepData + sessionContext
 * merged together by A2UIChat.buildUiFromData) and walks the schema tree,
 * replacing every "$variable" string with the corresponding value from data.
 *
 * Called once per step render, before any React component sees the schema.
 * After this runs, the component tree contains real values — no "$..." strings.
 *
 * Entry point: parseUI(JSON.stringify({ ui, data }))
 */

import { applyTransform, type TransformSpec } from "./transform"

type AnyObject = Record<string, any>

/**
 * Resolve nested paths like:
 * user.name
 * users[0].name
 * cart.items[2].price
 */
const getValue = (data: AnyObject, path: string): any => {
  const parts = path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")

  return parts.reduce((obj, key) => obj?.[key], data)
}

/**
 * Simple value formatters
 */
const formatValue = (value: any, formatter?: string) => {
  if (!formatter) return value

  switch (formatter.trim()) {
    case "currency":
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR"
      }).format(Number(value))

    case "date":
      return new Date(value).toLocaleDateString()

    case "time":
      return new Date(value).toLocaleTimeString()

    default:
      return value
  }
}

/**
 * Resolve a variable expression
 * Examples:
 * $price
 * $user.name
 * $price | currency
 */
const resolveVariable = (expr: string, data: AnyObject) => {
  const [path, formatter] = expr.split("|")

  const value = getValue(data, path.trim())

  if (value === undefined) return "N/A"

  return formatValue(value, formatter)
}

/**
 * Recursively walks the UI schema and resolves all $variable references.
 *
 * Processing order:
 *   1. String "$var"         → exact variable lookup (returns the real value, any type)
 *   2. String "text $var"    → interpolated string (replaces $vars within surrounding text)
 *   3. { $transform: {...} } → runs applyTransform() for data pipelines (charts, KPIs)
 *   4. { forEach, item, component } → expands an array into repeated component nodes
 *   5. Array                 → recurse each element
 *   6. Object                → recurse each value
 *   7. Primitive             → returned unchanged
 */
export const mapDataToUI = (ui: any, data: AnyObject): any => {
  // handle string variables
  if (typeof ui === "string") {
    // exact variable
    const exact = ui.match(/^\$([a-zA-Z0-9_.[\]]+(?:\s*\|\s*\w+)?)$/)

    if (exact) {
      return resolveVariable(exact[1], data)
    }

    // replace variables inside string
    return ui.replace(/\$([a-zA-Z0-9_.[\]]+(?:\s*\|\s*\w+)?)/g, (_, expr) => {
      const value = resolveVariable(expr, data)
      return typeof value === "string" ? value : String(value)
    })
  }

  // handle arrays
  if (Array.isArray(ui)) {
    return ui.map(item => mapDataToUI(item, data))
  }

  // handle objects
  if (ui !== null && typeof ui === "object") {
    // $transform directive: { "$transform": { from: "$path", type: "...", ... } }
    if ("$transform" in ui) {
      const spec = ui.$transform
      if (spec && typeof spec === "object" && typeof spec.from === "string") {
        const sourcePath = (spec.from as string).replace(/^\$/, "")
        const source = getValue(data, sourcePath)
        const { from: _from, ...transformSpec } = spec
        return applyTransform(source, transformSpec as TransformSpec)
      }
      return null
    }

    // LOOP HANDLING
    if (ui.forEach && ui.item && ui.component) {

      const list = getValue(data, ui.forEach.replace("$", ""))

      if (!Array.isArray(list)) return []

      return list.map((value, index) => {

        const loopData = {
          ...data,
          [ui.item]: value,
          index
        }

        return mapDataToUI(ui.component, loopData)
      })
    }

    const result: AnyObject = {}

    for (const key in ui) {
      result[key] = mapDataToUI(ui[key], data)
    }

    return result
  }

  return ui
}

/**
 * Entry point called by A2UIChat.buildUiFromData.
 * Expects input = JSON.stringify({ ui, data }).
 *
 * POST / create mode → ui only, data is null → returns schema as-is (no variable resolution)
 * GET / view mode   → ui + data → resolves all $variables and returns a ready-to-render tree
 */
export const parseUI = (input: any) => {
  if (!input) return null

  try {
    const parsed = JSON.parse(input)

    const { ui, data } = parsed

    // POST case (schema only)
    if (ui && !data) {
      return ui
    }

    // GET case (schema + data)
    if (ui && data) {
      return mapDataToUI(ui, data)
    }

    return null
  } catch {
    return null
  }
}