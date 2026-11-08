import { oc, type ContractRouter, type ErrorMap } from "@orpc/contract";
import type { z } from "zod";

// What every procedure tells an agent (ADR 0018). The MCP server will map
// these onto tool descriptions and annotations without touching contracts.
export type AgentMeta = {
  description: string;
  examples: readonly unknown[];
  // Reads only; safe to call speculatively.
  readOnly: boolean;
  // Calling twice with the same input leaves the same state as calling once.
  idempotent: boolean;
};

type ProcedureSpec<
  TInput extends z.ZodType,
  TOutput extends z.ZodType,
  TErrors extends ErrorMap,
> = {
  description: string;
  // At least one input an agent can copy; typed against the input schema.
  examples: readonly [z.input<TInput>, ...z.input<TInput>[]];
  readOnly: boolean;
  idempotent: boolean;
  input: TInput;
  output: TOutput;
  errors: TErrors;
};

// The only way to declare a procedure: description, examples and hints are
// required parameters, so a procedure without them does not compile.
export function procedure<
  TInput extends z.ZodType,
  TOutput extends z.ZodType,
  TErrors extends ErrorMap,
>(spec: ProcedureSpec<TInput, TOutput, TErrors>) {
  const meta: AgentMeta = {
    description: spec.description,
    examples: spec.examples,
    readOnly: spec.readOnly,
    idempotent: spec.idempotent,
  };
  return oc.$meta<AgentMeta>(meta).errors(spec.errors).input(spec.input).output(spec.output);
}

// A procedure built with raw `oc` carries no AgentMeta and fails this bound.
export function defineContract<T extends ContractRouter<AgentMeta>>(router: T): T {
  return router;
}
