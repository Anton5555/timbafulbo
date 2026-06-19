import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { localizedRedirectFromRequest } from "@/lib/localized-redirect"

export default async function AuthedLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    await localizedRedirectFromRequest("/")
  }

  return <main className="min-h-svh">{children}</main>
}
