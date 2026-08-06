import { setRequestLocale } from "next-intl/server";
import { GuardianClient } from "@/components/GuardianClient";
import { PageContainer } from "@/components/PageContainer";

export default async function GuardianPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main id="main-content">
      <PageContainer>
        <GuardianClient />
      </PageContainer>
    </main>
  );
}
