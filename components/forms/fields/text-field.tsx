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
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type TextFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label: string
  description?: ReactNode
  placeholder?: string
  disabled?: boolean
  className?: string
  inputClassName?: string
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder,
  disabled,
  className,
  inputClassName,
}: TextFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel className="text-[10px] font-bold tracking-widest uppercase">
            {label}
          </FormLabel>
          {description ? (
            <FormDescription className="text-[10px] leading-snug">
              {description}
            </FormDescription>
          ) : null}
          <FormControl>
            <Input
              placeholder={placeholder}
              disabled={disabled}
              autoComplete="off"
              className={cn(
                "h-11 rounded-none border-border bg-muted/10 text-sm font-bold md:h-10",
                inputClassName
              )}
              {...field}
            />
          </FormControl>
          <FormMessage className="text-[10px]" />
        </FormItem>
      )}
    />
  )
}
