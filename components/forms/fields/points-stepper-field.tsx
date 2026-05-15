"use client"

import type { Control, FieldPath, FieldValues } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const PTS_MIN = 0
const PTS_MAX = 20

function PointsStepperControl({
  value,
  onChange,
  disabled,
  label,
  suffix,
}: {
  value: number
  onChange: (n: number) => void
  disabled?: boolean
  label: string
  suffix: string
}) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
      <FormLabel className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
        {label}
      </FormLabel>
      <FormControl>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            className="rounded-none border-border"
            disabled={disabled || value <= PTS_MIN}
            onClick={() => onChange(Math.max(PTS_MIN, value - 1))}
            aria-label={`Menos ${suffix}`}
          >
            −
          </Button>
          <span className="min-w-8 text-center font-black tabular-nums text-foreground">
            {value}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            className="rounded-none border-border"
            disabled={disabled || value >= PTS_MAX}
            onClick={() => onChange(Math.min(PTS_MAX, value + 1))}
            aria-label={`Más ${suffix}`}
          >
            +
          </Button>
          <span className="text-[10px] font-bold tabular-nums text-muted-foreground uppercase">
            {suffix}
          </span>
        </div>
      </FormControl>
    </div>
  )
}

type PointsStepperFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label: string
  suffix: string
  disabled?: boolean
}

export function PointsStepperField<T extends FieldValues>({
  control,
  name,
  label,
  suffix,
  disabled,
}: PointsStepperFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <PointsStepperControl
            label={label}
            suffix={suffix}
            value={field.value}
            onChange={field.onChange}
            disabled={disabled}
          />
          <FormMessage className="text-[10px]" />
        </FormItem>
      )}
    />
  )
}
