/**
 * Patient schema barrel.
 *
 * Layer: entities / schemas / patient
 *
 * Single import point for all Patient schemas and types. All other modules
 * import from this barrel — never from the sub-files directly.
 *
 *  response.ts  — response schemas + paginated wrapper + sub-resource list types
 *  input.ts     — validation schemas + DTO types (enum literals, core + sub-resources)
 *  actions.ts   — ZSA action schemas (wraps input schemas with transportOptions)
 *  forms.ts     — flat React Hook Form schemas (Create + Edit)
 */

export * from "./response";
export * from "./input";
export * from "./actions";
export * from "./forms";
