"use client";

import { useLocale } from "next-intl";
import { enGB, fr } from "react-day-picker/locale";

// Month and weekday names for the date picker, in the UI language.
export function useCalendarLocale() {
  return useLocale() === "fr" ? fr : enGB;
}
