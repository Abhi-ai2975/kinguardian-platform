/**
 * Terminology server actions — ZSA wrappers for all five /terminology endpoints.
 *
 * Layer: server / presentation / actions / terminology
 *
 * All actions use authenticatedProcedure — terminology is clinical reference data
 * readable by any signed-in user, not restricted to admins.
 *
 * No transportOptions on any action — all terminology operations are read-only.
 *
 * Endpoints covered:
 *   searchAction             → GET  /terminology/search
 *   getConceptsForFieldAction → GET  /terminology/concepts
 *   lookupAction             → POST /terminology/lookup
 *   lookupBatchAction        → POST /terminology/lookup-batch
 *   validateAction           → POST /terminology/validate
 */

"use server";

import { authenticatedProcedure } from "../procedures";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import {
  getConceptsForFieldController,
  lookupBatchController,
  lookupController,
  searchController,
  validateController,
} from "@/modules/server/core/terminology/interface-adapters/controllers";
import {
  GetConceptsForFieldActionSchema,
  LookupActionSchema,
  LookupBatchActionSchema,
  SearchActionSchema,
  ValidateActionSchema,
} from "@/modules/entities/schemas/terminology/terminology.schema";

/**
 * Full-text concept search.
 * Input:  { payload: { q, system?, limit?, offset? } }
 * Returns: SearchResponse — paginated concepts ranked by similarity.
 */
export const searchTerminologyAction = authenticatedProcedure
  .createServerAction()
  .input(SearchActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport(async () => {
      const data = await searchController(input.payload);
      return { result: data };
    });
  });

/**
 * Fetch value-set concepts for a FHIR resource field.
 * Input:  { payload: { resource, field, q?, limit?, offset? } }
 * Returns: ConceptsForFieldResponse — concepts valid for that field.
 */
export const getConceptsForFieldAction = authenticatedProcedure
  .createServerAction()
  .input(GetConceptsForFieldActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport(async () => {
      const data = await getConceptsForFieldController(input.payload);
      return { result: data };
    });
  });

/**
 * Look up a single concept by system+code.
 * Input:  { payload: { system, code } }
 * Returns: LookupResult — found flag + optional concept details.
 */
export const lookupTerminologyAction = authenticatedProcedure
  .createServerAction()
  .input(LookupActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport(async () => {
      const data = await lookupController(input.payload);
      return { result: data };
    });
  });

/**
 * Bulk concept lookup — up to 100 system+code pairs in one call.
 * Input:  { payload: { items: [{ system, code }] } }
 * Returns: LookupBatchResponse — one LookupResult per item, in input order.
 */
export const lookupBatchTerminologyAction = authenticatedProcedure
  .createServerAction()
  .input(LookupBatchActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport(async () => {
      const data = await lookupBatchController(input.payload);
      return { result: data };
    });
  });

/**
 * Validate a code against a FHIR resource field binding.
 * Input:  { payload: { resource, field, system, code } }
 * Returns: ValidateResponse — valid flag, in_value_set flag, and message.
 */
export const validateTerminologyAction = authenticatedProcedure
  .createServerAction()
  .input(ValidateActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport(async () => {
      const data = await validateController(input.payload);
      return { result: data };
    });
  });
