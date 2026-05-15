"use client"

import type { Control, FieldPath, FieldValues } from "react-hook-form"

import { EmailPillsInput } from "@/components/dashboard/create-tournament/email-pills-input"
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

type InviteesFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  ownerEmail: string | null
  disabled?: boolean
  inputId?: string
}

export function InviteesField<T extends FieldValues>({
  control,
  name,
  ownerEmail,
  disabled,
  inputId = "invite-emails",
}: InviteesFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel
            htmlFor={inputId}
            className="text-[10px] font-bold tracking-widest uppercase"
          >
            Correos de invitación
          </FormLabel>
          <EmailPillsInput
            id={inputId}
            hideLabel
            invalid={fieldState.invalid}
            value={field.value}
            onChange={field.onChange}
            ownerEmail={ownerEmail}
            disabled={disabled}
          />
          <FormMessage className="text-[10px]" />
        </FormItem>
      )}
    />
  )
}
