"use client"

import { parseAsStringLiteral } from "nuqs"

/** `?matchFilter=` — matches view only. */
export const dashboardMatchFilterParser = parseAsStringLiteral([
  "pending",
  "finished",
] as const).withDefault("pending")
