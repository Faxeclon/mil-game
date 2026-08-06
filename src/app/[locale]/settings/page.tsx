import { setRequestLocale } from "next-intl/server";
import { PageContainer } from "@/components/PageContainer";
import { SettingsClient } from "@/components/SettingsClient";

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main id="main-content">
      <PageContainer>
        <SettingsClient />
      </PageContainer>
    </main>
  );
}
