import { MatchesTabShell } from "./matches-tab-shell"
import type { MatchesTabMatch } from "./types"

export type { MatchesTabMatch, MatchesTabTeam } from "./types"

export function MatchesTab({
  predictionsEnabled,
  tournaments,
  matches,
  currentUserEmail,
  inviteFromEmail,
}: {
  predictionsEnabled: boolean
  tournaments: { id: string; name: string }[]
  matches: MatchesTabMatch[]
  currentUserEmail: string | null
  inviteFromEmail: string
}) {
  // eslint-disable-next-line react-hooks/purity -- instante de render del RSC
  const referenceTimeMs = Date.now()

  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/10 px-4 py-16 text-center">
        <p className="font-mono text-sm text-muted-foreground">
          [ SISTEMA: NO HAY PARTIDOS CARGADOS ]
        </p>
      </div>
    )
  }

  return (
    <MatchesTabShell
      predictionsEnabled={predictionsEnabled}
      tournaments={tournaments}
      matches={matches}
      referenceTimeMs={referenceTimeMs}
      currentUserEmail={currentUserEmail}
      inviteFromEmail={inviteFromEmail}
    />
  )
}
