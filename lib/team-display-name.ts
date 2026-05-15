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

/** Spanish label for UI; falls back to stored name for placeholders and unknown codes. */
export function displayTeamNameEs(team: TeamForDisplay): string {
  const code = normalizeTeamCode(team.code)
  if (isPlaceholderTeamCode(code)) return team.name
  return TEAM_NAME_ES_BY_CODE[code] ?? team.name
}
