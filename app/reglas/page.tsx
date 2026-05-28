import type { ReactNode } from "react"
import { headers } from "next/headers"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { auth } from "@/lib/auth"

const GITHUB_ISSUES_URL = "https://github.com/Anton5555/timbafulbo/issues"

export const dynamic = "force-dynamic"

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
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  const backHref = session ? "/dashboard" : "/"
  const backLabel = session ? "Volver al panel" : "Volver al inicio"

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
              Reglas · Mundial 2026
            </div>
            <h1 className="text-2xl font-black tracking-tighter text-foreground uppercase italic sm:text-3xl">
              El reglamento del picadito
            </h1>
            <p className="max-w-[50ch] text-sm text-muted-foreground">
              Leé esto antes de mandarte un offside con el prode. Nada de letra
              chica aburrida — solo lo que tenés que saber para jugar tranqui.
            </p>
          </header>

          <RulesSection title="El picadito">
            <p>
              <strong className="text-foreground">timbafulbo</strong> es un
              prode personal, gratis y hecho por hinchas para hinchas. No es una
              casa de apuestas ni un producto corporativo: es un laburo de
              cancha para que armes ligas con la barra y veas quién la tiene más
              clara cuando suena el pitazo inicial.
            </p>
          </RulesSection>

          <RulesSection title="Cómo se juega">
            <p>
              Creás un torneo (tu liga), invitás a los compañeros con el link, y
              antes de que arranque cada partido cargás tu pronóstico: quién
              gana y el marcador. Cuando el partido termina, suman puntos los
              que acertaron el resultado y los que clavaron el score exacto.
            </p>
            <p>
              El detalle fino de cuánto vale cada acierto puede variar según el
              torneo — eso lo define quien arma la liga. Acá no hay VAR para
              reinterpretar el reglamento después del partido.
            </p>
          </RulesSection>

          <RulesSection title="Qué torneos hay (por ahora)">
            <p>
              Hoy solo manejamos el{" "}
              <strong className="text-foreground">Mundial 2026</strong>. Los
              datos de partidos y equipos vienen de la API gratuita de{" "}
              <a
                href="https://www.football-data.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                football-data.org
              </a>
              , y el proyecto es free to use y free to maintain — o sea, sin
              guita para pagar planes premium de datos.
            </p>
            <p>
              Por eso{" "}
              <strong className="text-foreground">todavía no hay</strong> Liga
              Argentina, Copa Libertadores, Champions ni otros torneos que no
              estén en esa API. Si algún día aparece guita o encontramos
              alternativas de datos, capaz sumamos más competiciones. Por ahora,
              mundial nomás.
            </p>
          </RulesSection>

          <RulesSection title="Fair play">
            <ul className="list-inside list-disc space-y-2">
              <li>
                No hay apuestas con plata real — es prode entre amigos, no
                casino.
              </li>
              <li>
                Los pronósticos se cierran cuando arranca el partido; después no
                se editan.
              </li>
            </ul>
          </RulesSection>

          <RulesSection title="Bugs y sugerencias">
            <p>
              Es un proyecto{" "}
              <strong className="text-foreground">personal</strong> y{" "}
              <strong className="text-foreground">open source</strong>. Si algo
              no anda, se rompió un partido o querés pedir una feature (otro
              torneo, mejor UI, lo que sea), escribile al creador o abrí un
              issue en GitHub. Los PRs también son bienvenidos.
            </p>
            <p>
              <Button variant="link" className="h-auto p-0 text-sm" asChild>
                <a
                  href={GITHUB_ISSUES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir issues en GitHub →
                </a>
              </Button>
            </p>
          </RulesSection>

          <RulesSection title="Sin garantías">
            <p>
              Puede haber downtime, datos que llegan tarde desde la API, o
              cambios sin aviso previo. Banque la buena onda.
            </p>
          </RulesSection>

          <footer className="border-t border-dashed border-border bg-muted/20 px-6 py-4 text-center">
            <span className="text-[9px] tracking-[0.3em] text-muted-foreground uppercase">
              © 2026 timbafulbo · hecho con buena onda
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
