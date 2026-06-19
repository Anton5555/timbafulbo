"use client"

import { useState } from "react"
import { ArrowRightIcon } from "@phosphor-icons/react"
import { useLocale, useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

function isSafeRelativePath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("://")
}

export function HomeSignIn() {
  const t = useTranslations("home")
  const locale = useLocale()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rawNext = searchParams.get("next")
  const callbackURL =
    rawNext && isSafeRelativePath(rawNext)
      ? rawNext
      : `/${locale}/dashboard`

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)

    const { error: signInError } = await authClient.signIn.social({
      provider: "google",
      callbackURL,
    })

    if (signInError) {
      setError(signInError.message ?? t("signInError"))
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3 pt-4">
        <Button
          className="h-12 w-full text-sm tracking-widest uppercase"
          size="lg"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          {loading ? t("signInRedirecting") : t("signInGoogle")}
          <ArrowRightIcon className="ml-2 size-4" weight="bold" />
        </Button>

        <p className="text-center text-[10px] text-muted-foreground uppercase">
          {t("signInFairPlay")}
        </p>
      </div>
      {error ? (
        <p className="text-center text-xs text-destructive">{error}</p>
      ) : null}
    </>
  )
}
