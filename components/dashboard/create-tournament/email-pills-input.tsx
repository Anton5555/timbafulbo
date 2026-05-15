"use client"

import { XIcon } from "@phosphor-icons/react"
import { useRef, useState, type ComponentProps } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  MAX_TOURNAMENT_INVITEES,
  normalizeInviteEmails,
} from "@/lib/create-tournament-schema"
import { cn } from "@/lib/utils"

const EMAIL_CHUNK =
  /[^\s,;]+@[^\s,;]+\.[^\s,;]+/g

function isValidEmail(raw: string): boolean {
  const v = raw.trim().toLowerCase()
  if (v.length < 5 || v.length > 320) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export function EmailPillsInput({
  value,
  onChange,
  ownerEmail,
  disabled,
  id,
  hideLabel,
  invalid,
  className,
  ...props
}: {
  value: string[]
  onChange: (next: string[]) => void
  ownerEmail: string | null
  disabled?: boolean
  id?: string
  /** When the label is provided by an external `FormLabel` (e.g. react-hook-form). */
  hideLabel?: boolean
  invalid?: boolean
} & Omit<ComponentProps<"div">, "children">) {
  const [draft, setDraft] = useState("")
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const ownerNorm = ownerEmail?.trim().toLowerCase() ?? ""

  function triggerShake() {
    setShake(true)
    window.setTimeout(() => setShake(false), 400)
  }

  function mergeEmails(extra: string[]) {
    const next = normalizeInviteEmails([...value, ...extra], ownerNorm).slice(
      0,
      MAX_TOURNAMENT_INVITEES
    )
    onChange(next)
  }

  function commitDraft() {
    const t = draft.trim()
    if (!t) return
    if (!isValidEmail(t)) {
      triggerShake()
      return
    }
    mergeEmails([t.trim().toLowerCase()])
    setDraft("")
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text")
    if (!text.includes("@")) return
    e.preventDefault()
    const raw = text.match(EMAIL_CHUNK) ?? []
    if (raw.length === 0) {
      triggerShake()
      return
    }
    const invalid = raw.some((r) => !isValidEmail(r))
    if (invalid) triggerShake()
    const valid = raw.map((r) => r.trim().toLowerCase()).filter(isValidEmail)
    if (valid.length > 0) {
      mergeEmails(valid)
      setDraft("")
    }
  }

  function removeAt(email: string) {
    onChange(value.filter((x) => x !== email))
  }

  const hint =
    value.length >= MAX_TOURNAMENT_INVITEES
      ? `Límite: ${MAX_TOURNAMENT_INVITEES} invitados.`
      : null

  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      {hideLabel ? null : (
        <Label
          htmlFor={id}
          className="text-[10px] font-bold tracking-widest uppercase"
        >
          Correos de invitación
        </Label>
      )}
      <div
        className={cn(
          "flex min-h-10 flex-wrap gap-1.5 rounded-none border border-border bg-muted/20 px-2 py-2 transition-[border-color]",
          shake && "border-destructive",
          invalid && "border-destructive",
          disabled && "opacity-60"
        )}
      >
        {value.map((email) => (
          <Badge
            key={email}
            variant="outline"
            className="gap-1 rounded-none border-border bg-background px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase"
          >
            <span className="max-w-[200px] truncate normal-case">{email}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="size-5 shrink-0 rounded-none"
              disabled={disabled}
              aria-label={`Quitar ${email}`}
              onClick={() => removeAt(email)}
            >
              <XIcon className="size-3" aria-hidden />
            </Button>
          </Badge>
        ))}
        <Input
          ref={inputRef}
          id={id}
          type="email"
          autoComplete="email"
          aria-invalid={invalid || undefined}
          disabled={disabled}
          placeholder={
            value.length === 0 ? "ejemplo@mail.com" : "Agregar otro…"
          }
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onPaste={onPaste}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "," || e.key === " ") {
              e.preventDefault()
              commitDraft()
            }
            if (e.key === "Backspace" && draft === "" && value.length > 0) {
              removeAt(value[value.length - 1]!)
            }
          }}
          onBlur={() => commitDraft()}
          className="min-w-48 flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
        />
      </div>
      {hint ? (
        <p className="text-[10px] font-medium text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
