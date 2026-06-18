export const SITE_NAME = "timbafulbo" as const

export function pageTitle(segment: string): string {
  return `${SITE_NAME} - ${segment}`
}
