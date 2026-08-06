import { setRequestLocale } from "next-intl/server";
import { PageContainer } from "@/components/PageContainer";
import { ProfileRouteGuard } from "@/components/ProfileRouteGuard";
import { RanksClient } from "@/components/RanksClient";

export default async function RanksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main id="main-content">
      <PageContainer>
        <ProfileRouteGuard>
          <RanksClient />
        </ProfileRouteGuard>
      </PageContainer>
    </main>
  );
}
