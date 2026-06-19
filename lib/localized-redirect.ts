import { getLocale } from "next-intl/server"

import { redirect, routing } from "@/i18n/routing"

type AppLocale = (typeof routing.locales)[number]

export function localizedRedirect(href: string, locale: string): never {
  return redirect({ href, locale: locale as AppLocale })
}

export async function localizedRedirectFromRequest(href: string): Promise<never> {
  const locale = await getLocale()
  return localizedRedirect(href, locale)
}
