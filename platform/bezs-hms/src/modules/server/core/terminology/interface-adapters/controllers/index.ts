/**
 * Barrel export for all Terminology controllers and their output types.
 *
 * Layer: server / core / terminology / interface-adapters / controllers
 */

export {
  searchController,
  type TSearchControllerOutput,
} from "./search.controller";

export {
  getConceptsForFieldController,
  type TGetConceptsForFieldControllerOutput,
} from "./getConceptsForField.controller";

export {
  lookupController,
  type TLookupControllerOutput,
} from "./lookup.controller";

export {
  lookupBatchController,
  type TLookupBatchControllerOutput,
} from "./lookupBatch.controller";

export {
  validateController,
  type TValidateControllerOutput,
} from "./validate.controller";
