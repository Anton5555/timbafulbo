"use client"

import { useLinkStatus } from "next/link"
import { type ReactNode } from "react"

import { useNavigationPending } from "@/components/dashboard/navigation-pending-context"
import { Link } from "@/i18n/routing"
import { cn } from "@/lib/utils"

function DashboardTabLinkStatus({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus()

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1.5",
        pending && "opacity-60"
      )}
      aria-busy={pending || undefined}
    >
      {children}
    </span>
  )
}

export function DashboardTabLink({
  href,
  active,
  className,
  children,
}: {
  href: string
  active: boolean
  className?: string
  children: ReactNode
}) {
  const { setLinkPending } = useNavigationPending()

  return (
    <Link
      role="tab"
      href={href}
      className={className}
      aria-current={active ? "page" : undefined}
      onNavigate={() => {
        setLinkPending(true)
      }}
    >
      <DashboardTabLinkStatus>{children}</DashboardTabLinkStatus>
    </Link>
  )
}
