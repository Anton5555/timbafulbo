import createMiddleware from "next-intl/middleware"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { routing } from "@/i18n/routing"
import { auth } from "@/lib/auth"

const intlMiddleware = createMiddleware(routing)

const LOCALE_PATTERN = /^\/(es|en)(?=\/|$)/

function stripLocale(pathname: string): string {
  const without = pathname.replace(LOCALE_PATTERN, "")
  return without === "" ? "/" : without
}

export default async function proxy(request: NextRequest) {
  const intlResponse = intlMiddleware(request)

  if (request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next()
  }

  const pathname = request.nextUrl.pathname
  const pathnameWithoutLocale = stripLocale(pathname)
  const isProtected =
    pathnameWithoutLocale === "/dashboard" ||
    pathnameWithoutLocale.startsWith("/dashboard/")

  if (!isProtected) {
    return intlResponse
  }

  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (session) {
    return intlResponse
  }

  const localeMatch = pathname.match(LOCALE_PATTERN)
  const locale = localeMatch?.[1] ?? routing.defaultLocale
  const homeUrl = new URL(`/${locale}`, request.url)
  homeUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`)
  return NextResponse.redirect(homeUrl)
}

export const config = {
  matcher: [
    "/",
    "/(es|en)/:path*",
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
}
