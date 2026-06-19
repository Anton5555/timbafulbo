"use client"

import { useLocale } from "next-intl"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { routing, usePathname, useRouter } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

type LanguageSwitcherProps = {
  variant?: "dropdown" | "inline"
  className?: string
}

export function LanguageSwitcher({
  variant = "dropdown",
  className,
}: LanguageSwitcherProps) {
  const t = useTranslations("common")
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  function switchLocale(nextLocale: (typeof routing.locales)[number]) {
    router.replace(pathname, { locale: nextLocale })
  }

  if (variant === "inline") {
    return (
      <div
        className={cn("flex items-center gap-1 font-mono text-[10px] uppercase", className)}
        role="group"
        aria-label={t("language")}
      >
        {routing.locales.map((code) => (
          <Button
            key={code}
            type="button"
            variant={locale === code ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2 text-[10px] tracking-widest uppercase"
            onClick={() => switchLocale(code)}
            aria-pressed={locale === code}
          >
            {code === "es" ? t("languageEs") : t("languageEn")}
          </Button>
        ))}
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px-2 text-[10px] font-bold tracking-widest uppercase",
            className
          )}
        >
          {locale === "es" ? t("languageEs") : t("languageEn")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="font-mono">
        <DropdownMenuLabel className="text-[10px] tracking-widest uppercase">
          {t("language")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {routing.locales.map((code) => (
          <DropdownMenuItem
            key={code}
            className="cursor-pointer text-[10px] tracking-widest uppercase"
            disabled={locale === code}
            onSelect={() => switchLocale(code)}
          >
            {code === "es" ? t("languageEs") : t("languageEn")}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
