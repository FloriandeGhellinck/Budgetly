import { Button } from "@expense/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@expense/ui/components/card";
import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app-shell/page-header";
import { createSupabase } from "@/lib/supabase/server";
import { TotpSetup } from "./totp-setup";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("security"))("title") };
}

export default async function SecurityPage() {
  const t = await getTranslations("security");
  const supabase = await createSupabase();
  const { data } = await supabase.auth.mfa.listFactors();
  const factor = data?.totp.find((f) => f.status === "verified") ?? null;
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("title")}
        actions={
          <Button variant="ghost" size="sm" render={<Link href="/settings" />}>
            <ArrowLeftIcon />
            {t("back")}
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>{factor ? t("enabled") : t("disabled")}</CardTitle>
          <CardDescription className="sr-only">{t("title")}</CardDescription>
        </CardHeader>
        <CardContent>
          <TotpSetup factorId={factor?.id ?? null} />
        </CardContent>
      </Card>
    </div>
  );
}
