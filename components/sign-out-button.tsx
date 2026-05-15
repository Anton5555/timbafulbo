"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

export function SignOutButton() {
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
          window.location.href = "/"
        }
      }}
    >
      {loading ? "Cerrando sesión…" : "Salir"}
    </Button>
  )
}
