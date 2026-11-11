import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@budgetly/ui/components/card";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { env } from "@/lib/env";
import { createSupabase } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("login");
  return { title: t("title") };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const supabase = await createSupabase();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect("/");

  const t = await getTranslations("login");
  const { error } = await searchParams;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm googleEnabled={env().AUTH_GOOGLE_ENABLED} linkInvalid={error === "link"} />
      </CardContent>
    </Card>
  );
}
