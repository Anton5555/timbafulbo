"use client"

import * as React from "react"

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useIsDesktopSm } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

export function CreateTournamentResponsiveShell({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer: React.ReactNode
}) {
  const desktop = useIsDesktopSm()

  if (desktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          showCloseButton
          className="flex h-full w-full max-h-full flex-col gap-0 border-border bg-background p-0 sm:max-w-md md:max-w-lg"
        >
          <SheetHeader className="shrink-0 border-b border-dashed border-border px-4 pt-4 pb-3 text-left">
            <SheetTitle className="text-[10px] font-black tracking-[0.25em] text-muted-foreground uppercase">
              {title}
            </SheetTitle>
            {description !== undefined ? (
              <SheetDescription className="text-xs font-normal normal-case tracking-normal text-muted-foreground">
                {description}
              </SheetDescription>
            ) : null}
          </SheetHeader>
          <ScrollArea className="min-h-0 flex-1">
            <div className="px-4 py-4">{children}</div>
          </ScrollArea>
          <div
            className={cn(
              "shrink-0 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm",
              "supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            )}
          >
            {footer}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex h-[min(85svh,100dvh)] max-h-[min(85svh,100dvh)] min-h-0 flex-col gap-0 border-border bg-background p-0">
        <DrawerHeader className="shrink-0 border-b border-dashed border-border px-4 pt-2 pb-3 text-left">
          <DrawerTitle className="text-[10px] font-black tracking-[0.25em] text-muted-foreground uppercase">
            {title}
          </DrawerTitle>
          {description !== undefined ? (
            <DrawerDescription className="text-xs font-normal normal-case tracking-normal text-muted-foreground">
              {description}
            </DrawerDescription>
          ) : null}
        </DrawerHeader>
        {/* Native overflow scroll: Radix ScrollArea + Vaul drawer often fails to shrink the viewport; this keeps the form CTA reachable. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="px-4 py-4">{children}</div>
        </div>
        <div
          className={cn(
            "shrink-0 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md",
            "supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          )}
        >
          {footer}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
