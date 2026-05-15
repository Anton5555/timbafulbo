"use client"

import { NotePencilIcon, TrophyIcon, UsersIcon } from "@phosphor-icons/react"

export function HomeFeatures() {
  return (
    <div id="reglas" className="flex flex-col gap-4 scroll-mt-24">
      <div className="flex items-center gap-3 text-sm">
        <div className="flex size-9 shrink-0 items-center justify-center border border-border bg-muted sm:size-10">
          <TrophyIcon
            className="size-4 sm:size-5"
            weight="duotone"
            aria-hidden
          />
        </div>
        <span>Torneos privados: tu grupo, tus reglas.</span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <div className="flex size-9 shrink-0 items-center justify-center border border-border bg-muted sm:size-10">
          <NotePencilIcon
            className="size-4 sm:size-5"
            weight="duotone"
            aria-hidden
          />
        </div>
        <span>
          Usamos la API de football-data.org para fixtures y resultados casi en
          tiempo real.
        </span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <div className="flex size-9 shrink-0 items-center justify-center border border-border bg-muted sm:size-10">
          <UsersIcon
            className="size-4 sm:size-5"
            weight="duotone"
            aria-hidden
          />
        </div>
        <span>Subí en tablas globales y privadas.</span>
      </div>
    </div>
  )
}
