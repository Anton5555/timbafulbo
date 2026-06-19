import type { Metadata } from "next"
import type { ReactNode } from "react"
import { headers } from "next/headers"
import { getTranslations } from "next-intl/server"

import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/routing"
import { auth } from "@/lib/auth"
import { PREDICTION_LOCK_MINUTES_BEFORE } from "@/lib/prediction-window"

const GITHUB_ISSUES_URL = "https://github.com/Anton5555/timbafulbo/issues"
const FOOTBALL_DATA_URL = "https://www.football-data.org/"

export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reglas")

  return {
    title: t("title"),
  }
}

function RulesSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3 border-b border-dashed border-border px-6 py-6 last:border-b-0">
      <h2 className="text-[10px] font-bold tracking-[0.2em] text-primary uppercase">
        {title}
      </h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  )
}

export default async function ReglasPage() {
  const t = await getTranslations("reglas")

  const session = await auth.api.getSession({
    headers: await headers(),
  })

  const backHref = session ? "/dashboard" : "/"
  const backLabel = session ? t("backDashboard") : t("backHome")

  return (
    <div className="relative flex min-h-svh flex-col items-center bg-background p-6 font-mono lg:p-12">
      <div
        className="fixed inset-0 -z-10 bg-[linear-gradient(to_right,oklch(0.55_0.12_150/0.06)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.55_0.12_150/0.06)_1px,transparent_1px)] bg-size-[14px_24px]"
        aria-hidden
      />

      <div className="flex w-full max-w-3xl flex-col gap-6">
        <Button variant="ghost" size="sm" className="w-fit px-0" asChild>
          <Link
            href={backHref}
            className="text-[10px] tracking-[0.2em] uppercase"
          >
            ← {backLabel}
          </Link>
        </Button>

        <article className="relative overflow-hidden border border-border bg-card shadow-2xl">
          <header className="flex flex-col gap-3 border-b border-dashed border-border bg-muted/50 px-6 py-5">
            <div className="w-fit bg-primary px-3 py-1 text-[10px] font-bold tracking-[0.2em] text-primary-foreground uppercase">
              {t("badge")}
            </div>
            <h1 className="text-2xl font-black tracking-tighter text-foreground uppercase italic sm:text-3xl">
              {t("pageTitle")}
            </h1>
            <p className="max-w-[50ch] text-sm text-muted-foreground">
              {t("intro")}
            </p>
          </header>

          <RulesSection title={t("sectionPicadito")}>
            <p>
              {t.rich("picaditoBody", {
                brand: (chunks) => (
                  <strong className="text-foreground">{chunks}</strong>
                ),
              })}
            </p>
          </RulesSection>

          <RulesSection title={t("sectionHowToPlay")}>
            <p>{t("howToPlayBody1")}</p>
            <p>{t("howToPlayBody2")}</p>
          </RulesSection>

          <RulesSection title={t("sectionTournaments")}>
            <p>
              {t.rich("tournamentsBody1", {
                tournament: () => (
                  <strong className="text-foreground">{t("worldCup")}</strong>
                ),
                apiLink: (chunks) => (
                  <a
                    href={FOOTBALL_DATA_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {chunks}
                  </a>
                ),
              })}
            </p>
            <p>
              {t.rich("tournamentsBody2", {
                notYet: () => (
                  <strong className="text-foreground">{t("notYet")}</strong>
                ),
              })}
            </p>
          </RulesSection>

          <RulesSection title={t("sectionFairPlay")}>
            <ul className="list-inside list-disc space-y-2">
              <li>{t("fairPlayBetting")}</li>
              <li>
                {t("fairPlayLock", {
                  minutes: PREDICTION_LOCK_MINUTES_BEFORE,
                })}
              </li>
            </ul>
          </RulesSection>

          <RulesSection title={t("sectionBugs")}>
            <p>
              {t.rich("bugsBody1", {
                personal: () => (
                  <strong className="text-foreground">{t("personal")}</strong>
                ),
                openSource: () => (
                  <strong className="text-foreground">{t("openSource")}</strong>
                ),
              })}
            </p>
            <p>
              <Button variant="link" className="h-auto p-0 text-sm" asChild>
                <a
                  href={GITHUB_ISSUES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("openGithub")}
                </a>
              </Button>
            </p>
          </RulesSection>

          <RulesSection title={t("sectionDisclaimer")}>
            <p>{t("disclaimerBody")}</p>
          </RulesSection>

          <footer className="border-t border-dashed border-border bg-muted/20 px-6 py-4 text-center">
            <span className="text-[9px] tracking-[0.3em] text-muted-foreground uppercase">
              {t("footer")}
            </span>
          </footer>

          <div
            className="absolute top-1/2 -left-3 size-6 -translate-y-1/2 rounded-full border-r border-border bg-background"
            aria-hidden
          />
          <div
            className="absolute top-1/2 -right-3 size-6 -translate-y-1/2 rounded-full border-l border-border bg-background"
            aria-hidden
          />
        </article>
      </div>
    </div>
  )
}
