import { routing } from "@/i18n/routing"

type AppLocale = (typeof routing.locales)[number]

/** Spanish display names keyed by ISO 3166-1 alpha-3 / football-data team code. */
export const TEAM_NAME_ES_BY_CODE: Readonly<Record<string, string>> = {
  URY: "Uruguay",
  GER: "Alemania",
  ESP: "España",
  PAR: "Paraguay",
  ARG: "Argentina",
  GHA: "Ghana",
  BRA: "Brasil",
  POR: "Portugal",
  JPN: "Japón",
  MEX: "México",
  ENG: "Inglaterra",
  USA: "Estados Unidos",
  KOR: "Corea del Sur",
  FRA: "Francia",
  RSA: "Sudáfrica",
  ALG: "Argelia",
  AUS: "Australia",
  NZL: "Nueva Zelanda",
  SUI: "Suiza",
  ECU: "Ecuador",
  SWE: "Suecia",
  CZE: "Chequia",
  CRO: "Croacia",
  KSA: "Arabia Saudita",
  TUN: "Túnez",
  TUR: "Turquía",
  SEN: "Senegal",
  BEL: "Bélgica",
  MAR: "Marruecos",
  AUT: "Austria",
  COL: "Colombia",
  EGY: "Egipto",
  CAN: "Canadá",
  HAI: "Haití",
  IRN: "Irán",
  BIH: "Bosnia y Herzegovina",
  PAN: "Panamá",
  CPV: "Cabo Verde",
  COD: "República Democrática del Congo",
  CIV: "Costa de Marfil",
  QAT: "Catar",
  JOR: "Jordania",
  IRQ: "Irak",
  UZB: "Uzbekistán",
  NED: "Países Bajos",
  NOR: "Noruega",
  SCO: "Escocia",
  CUR: "Curazao",
}

/** English display names keyed by ISO 3166-1 alpha-3 / football-data team code. */
export const TEAM_NAME_EN_BY_CODE: Readonly<Record<string, string>> = {
  URY: "Uruguay",
  GER: "Germany",
  ESP: "Spain",
  PAR: "Paraguay",
  ARG: "Argentina",
  GHA: "Ghana",
  BRA: "Brazil",
  POR: "Portugal",
  JPN: "Japan",
  MEX: "Mexico",
  ENG: "England",
  USA: "United States",
  KOR: "South Korea",
  FRA: "France",
  RSA: "South Africa",
  ALG: "Algeria",
  AUS: "Australia",
  NZL: "New Zealand",
  SUI: "Switzerland",
  ECU: "Ecuador",
  SWE: "Sweden",
  CZE: "Czechia",
  CRO: "Croatia",
  KSA: "Saudi Arabia",
  TUN: "Tunisia",
  TUR: "Turkey",
  SEN: "Senegal",
  BEL: "Belgium",
  MAR: "Morocco",
  AUT: "Austria",
  COL: "Colombia",
  EGY: "Egypt",
  CAN: "Canada",
  HAI: "Haiti",
  IRN: "Iran",
  BIH: "Bosnia and Herzegovina",
  PAN: "Panama",
  CPV: "Cape Verde",
  COD: "DR Congo",
  CIV: "Ivory Coast",
  QAT: "Qatar",
  JOR: "Jordan",
  IRQ: "Iraq",
  UZB: "Uzbekistan",
  NED: "Netherlands",
  NOR: "Norway",
  SCO: "Scotland",
  CUR: "Curaçao",
}

export type TeamForDisplay = {
  name: string
  code: string
}

function normalizeTeamCode(code: string): string {
  return code.trim().toUpperCase()
}

function isPlaceholderTeamCode(code: string): boolean {
  return normalizeTeamCode(code).startsWith("TBD")
}

function teamNameMapForLocale(locale: AppLocale): Readonly<Record<string, string>> {
  return locale === "en" ? TEAM_NAME_EN_BY_CODE : TEAM_NAME_ES_BY_CODE
}

/** Localized label for UI; falls back to stored name for placeholders and unknown codes. */
export function displayTeamName(
  team: TeamForDisplay,
  locale: AppLocale = routing.defaultLocale
): string {
  const code = normalizeTeamCode(team.code)
  if (isPlaceholderTeamCode(code)) return team.name
  return teamNameMapForLocale(locale)[code] ?? team.name
}

/** @deprecated Prefer `displayTeamName(team, locale)`. */
export function displayTeamNameEs(team: TeamForDisplay): string {
  return displayTeamName(team, "es")
}
