import { getTranslations } from "next-intl/server"
import type { z } from "zod"

import {
  type ActionErrorKey,
  isActionErrorKey,
  paramsForActionErrorKey,
} from "@/lib/action-error-keys"

export type { ActionErrorKey } from "@/lib/action-error-keys"
export { ACTION_ERROR_KEYS, isActionErrorKey } from "@/lib/action-error-keys"

export async function actionError(
  key: ActionErrorKey,
  values?: Record<string, string | number>
): Promise<string> {
  const t = await getTranslations("errors")
  return t(key, { ...paramsForActionErrorKey(key), ...values })
}

export async function actionErrorFromZod(error: z.ZodError): Promise<string> {
  const raw = error.issues[0]?.message
  if (raw && isActionErrorKey(raw)) {
    return actionError(raw)
  }
  return actionError("invalidData")
}

export async function resolveActionError(
  message: string,
  values?: Record<string, string | number>
): Promise<string> {
  if (isActionErrorKey(message)) {
    return actionError(message, values)
  }
  return message
}
