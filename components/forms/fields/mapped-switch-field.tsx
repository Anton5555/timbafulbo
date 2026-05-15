"use client"

import type { ReactNode } from "react"
import type { Control, FieldPath, FieldValues } from "react-hook-form"

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"

type MappedSwitchFieldProps<T extends FieldValues, V> = {
  control: Control<T>
  name: FieldPath<T>
  label: string
  description?: ReactNode
  disabled?: boolean
  className?: string
  trueValue: V
  falseValue: V
}

/** Switch que alterna entre dos valores arbitrarios (p. ej. 1 | 2). */
export function MappedSwitchField<T extends FieldValues, V>({
  control,
  name,
  label,
  description,
  disabled,
  className,
  trueValue,
  falseValue,
}: MappedSwitchFieldProps<T, V>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <div className="flex items-center justify-between gap-3 border-t border-dashed border-border pt-2">
            <div className="flex flex-col gap-0.5">
              <FormLabel className="text-[10px] font-bold tracking-widest uppercase">
                {label}
              </FormLabel>
              {description ? (
                <FormDescription className="text-[10px] leading-snug">
                  {description}
                </FormDescription>
              ) : null}
            </div>
            <FormControl>
              <Switch
                checked={field.value === trueValue}
                disabled={disabled}
                onCheckedChange={(checked) =>
                  field.onChange(checked ? trueValue : falseValue)
                }
              />
            </FormControl>
          </div>
          <FormMessage className="text-[10px]" />
        </FormItem>
      )}
    />
  )
}
