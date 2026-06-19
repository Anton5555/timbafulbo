"use client"

import { useLocale } from "next-intl"
import { useTranslations } from "next-intl"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

export function SignOutButton() {
  const t = useTranslations("account")
  const locale = useLocale()
  const [loading, setLoading] = useState(false)

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={async () => {
        setLoading(true)
        try {
          await authClient.signOut()
        } finally {
          window.location.href = `/${locale}`
        }
      }}
    >
      {loading ? t("signingOut") : t("signOut")}
    </Button>
  )
}
