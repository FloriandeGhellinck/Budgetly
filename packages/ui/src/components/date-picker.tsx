"use client";

import * as React from "react";
import { cn } from "cn";
import { CalendarIcon } from "lucide-react";
import type { Locale } from "react-day-picker";

import { Button } from "@expense/ui/components/button";
import { Calendar } from "@expense/ui/components/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@expense/ui/components/popover";

// shadcn has no date-picker registry item for Base UI; this is its documented popover + calendar recipe.
type DatePickerProps = {
  value: Date | undefined;
  onValueChange: (value: Date | undefined) => void;
  /** BCP 47 locale for the button label, e.g. `fr-BE`. */
  locale: string;
  /** react-day-picker locale for month and weekday names. */
  calendarLocale?: Partial<Locale>;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
};

function DatePicker({
  value,
  onValueChange,
  locale,
  calendarLocale,
  placeholder,
  disabled,
  id,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const label = value
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(value)
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant="outline"
            disabled={disabled}
            data-empty={value === undefined}
            className={cn(
              "w-full justify-start font-normal data-[empty=true]:text-muted-foreground",
              className,
            )}
          />
        }
      >
        <CalendarIcon />
        <span>{label}</span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={value}
          locale={calendarLocale}
          onSelect={(date) => {
            onValueChange(date);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker, type DatePickerProps };
