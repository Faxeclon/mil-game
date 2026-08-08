import { setRequestLocale } from "next-intl/server";
import { AdultJoinClient } from "@/components/AdultJoinClient";
import { PageContainer } from "@/components/PageContainer";

export default async function AdultJoinPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main id="main-content">
      <PageContainer>
        <AdultJoinClient />
      </PageContainer>
    </main>
  );
}
