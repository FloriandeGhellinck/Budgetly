"use server";

import { revalidatePath } from "next/cache";
import { createSupabase } from "@/lib/supabase/server";

// TOTP enrolment (ADR 0022), on the server like every auth call (ADR 0030).

export type TotpEnrollment = { factorId: string; qrCode: string; secret: string };

export async function startTotpEnrollment(): Promise<TotpEnrollment | null> {
  const supabase = await createSupabase();
  // An abandoned earlier attempt leaves an unverified factor; clear it first.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const factor of factors?.all ?? []) {
    if (factor.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `expense ${new Date().toISOString().slice(0, 10)}`,
  });
  if (error) {
    console.error("mfa.enroll failed", error.message);
    return null;
  }
  return { factorId: data.id, qrCode: toDataUri(data.totp.qr_code), secret: data.totp.secret };
}

// Auth returns `data:image/svg+xml;utf-8,<svg …>` with raw markup and a
// trailing newline, which next/image refuses; encode it.
function toDataUri(qrCode: string): string {
  const svg = qrCode.slice(qrCode.indexOf(",") + 1).trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export async function confirmTotpEnrollment(factorId: string, code: string): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  const supabase = await createSupabase();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return false;
  revalidatePath("/settings/security");
  return true;
}

export async function removeTotp(factorId: string): Promise<boolean> {
  const supabase = await createSupabase();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) {
    console.error("mfa.unenroll failed", error.message);
    return false;
  }
  revalidatePath("/settings/security");
  return true;
}
