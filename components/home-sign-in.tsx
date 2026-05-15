"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowRightIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

function isSafeRelativePath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("://")
}

export function HomeSignIn() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rawNext = searchParams.get("next")
  const callbackURL =
    rawNext && isSafeRelativePath(rawNext) ? rawNext : "/dashboard"

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)

    const { error: signInError } = await authClient.signIn.social({
      provider: "google",
      callbackURL,
    })

    if (signInError) {
      setError(signInError.message ?? "No se pudo iniciar sesión con Google.")
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
          {loading ? "Redirigiendo…" : "Ingresar con Google"}
          <ArrowRightIcon className="ml-2 size-4" weight="bold" />
        </Button>

        <p className="text-center text-[10px] text-muted-foreground uppercase">
          Al ingresar aceptás las reglas de Fair Play.
        </p>
      </div>
      {error ? (
        <p className="text-center text-xs text-destructive">{error}</p>
      ) : null}
    </>
  )
}
