import type { Direction } from "@budgetly/db";
import { z } from "zod";

export const Id = z.uuid();

// A calendar day, `YYYY-MM-DD`.
export const IsoDate = z.iso.date();

// A calendar month, `YYYY-MM`.
export const YearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected YYYY-MM");

// An instant, ISO 8601 in UTC.
export const Timestamp = z.iso.datetime();

// Positive integer cents (ADR 0003); the sign comes from the direction. Bounded
// by the Postgres integer column.
export const AmountMinor = z.int().positive().max(2_147_483_647);

export const DIRECTIONS = [
  "expense",
  "income",
  "transfer_out",
  "transfer_in",
] as const satisfies readonly Direction[];
export const DirectionSchema = z.enum(DIRECTIONS);

// Expenses and incomes; transfer legs are written through transfers.create.
export const EntryDirection = z.enum(["expense", "income"]);

export const Name = z.string().trim().min(1).max(200);

// Chosen by the caller, unique per user and write. Retrying with the same key
// returns the original result instead of writing twice (ADR 0027).
export const IdempotencyKey = z.string().trim().min(1).max(200);

export const EmptyInput = z.object({});

// Placeholder ids used in examples, so an agent sees the shape of a real call.
export const EXAMPLE_IDS = {
  account: "3f6c1d2e-8a4b-4c1e-9f0a-1b2c3d4e5f60",
  otherAccount: "7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d",
  category: "5b1e2d3c-4f5a-4b6c-9d7e-8f9a0b1c2d3e",
  group: "9c8b7a6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
  beneficiary: "2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a",
  transaction: "6e7f8a9b-0c1d-4e2f-8a3b-4c5d6e7f8a9b",
  transfer: "8f9a0b1c-2d3e-4f5a-9b6c-7d8e9f0a1b2c",
  tag: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
} as const;
