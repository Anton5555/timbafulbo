"use client"

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { useTranslations } from "next-intl"
import { useMemo } from "react"
import type { FieldValues, Resolver } from "react-hook-form"
import type { z } from "zod"

import {
  isActionErrorKey,
  paramsForActionErrorKey,
} from "@/lib/action-error-keys"

export function useTranslatedSchemaResolver<T extends FieldValues>(
  schema: z.ZodType<T>
): Resolver<T> {
  const t = useTranslations("errors")

  return useMemo(() => {
    const base = standardSchemaResolver(schema as never) as Resolver<T>

    const resolver: Resolver<T> = async (values, context, options) => {
      const result = await base(values, context, options)
      if (!result.errors) return result

      for (const key of Object.keys(result.errors)) {
        const fieldError = result.errors[key as keyof typeof result.errors]
        if (!fieldError || typeof fieldError.message !== "string") continue
        if (!isActionErrorKey(fieldError.message)) continue
        fieldError.message = t(
          fieldError.message,
          paramsForActionErrorKey(fieldError.message)
        )
      }

      return result
    }

    return resolver
  }, [schema, t])
}
