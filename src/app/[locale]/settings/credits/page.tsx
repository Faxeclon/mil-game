import { setRequestLocale } from "next-intl/server";
import { CreditsClient } from "@/components/CreditsClient";
import { PageContainer } from "@/components/PageContainer";

export default async function CreditsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <main id="main-content"><PageContainer><CreditsClient /></PageContainer></main>;
}
