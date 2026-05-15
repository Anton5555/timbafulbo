import countries from "i18n-iso-countries"

const TEAM_CODE_TO_FLAGCDN_CODE: Record<string, string> = {
  GER: "de",
  PAR: "py",
  RSA: "za",
  POR: "pt",
  ALG: "dz",
  SUI: "ch",
  CRO: "hr",
  KSA: "sa",
  HAI: "ht",
  NED: "nl",
  CUR: "cw",
  KOR: "kr",
  USA: "us",
  MEX: "mx",
  CZE: "cz",
  BIH: "ba",
  ENG: "gb-eng",
  SCO: "gb-sct",
  WAL: "gb-wls",
  NIR: "gb-nir",
}

function flagCdnSlugFromTeamCode(code: string): string | null {
  const normalized = code.trim().slice(0, 10).toUpperCase()
  const mapped = TEAM_CODE_TO_FLAGCDN_CODE[normalized]
  if (mapped) return mapped

  const iso3 = normalized.slice(0, 3)
  const iso2 = countries.alpha3ToAlpha2(iso3)?.toLowerCase()
  return iso2 ?? null
}

export function flagCdnUrlFromTeamCode(code: string): string | null {
  const slug = flagCdnSlugFromTeamCode(code)
  if (!slug) return null
  return `https://flagcdn.com/${slug}.svg`
}

export function flagCdnW80PngUrlFromTeamCode(code: string): string | null {
  const slug = flagCdnSlugFromTeamCode(code)
  if (!slug) return null
  return `https://flagcdn.com/w80/${slug}.png`
}
