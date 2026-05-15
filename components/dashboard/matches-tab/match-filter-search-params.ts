"use client"

import { parseAsStringLiteral } from "nuqs"

/** `?matchFilter=` — matches view only. */
export const dashboardMatchFilterParser = parseAsStringLiteral([
  "all",
  "pending",
  "finished",
] as const).withDefault("pending")
