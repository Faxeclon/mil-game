import { setRequestLocale } from "next-intl/server";
import { AdultClient } from "@/components/AdultClient";
import { PageContainer } from "@/components/PageContainer";

export default async function AdultPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main id="main-content">
      <PageContainer>
        <AdultClient />
      </PageContainer>
    </main>
  );
}
