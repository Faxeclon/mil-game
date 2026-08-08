import { setRequestLocale } from "next-intl/server";
import { FriendsClient } from "@/components/FriendsClient";
import { PageContainer } from "@/components/PageContainer";
import { ProfileRouteGuard } from "@/components/ProfileRouteGuard";

export default async function FriendsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main id="main-content">
      <PageContainer>
        <ProfileRouteGuard>
          <FriendsClient />
        </ProfileRouteGuard>
      </PageContainer>
    </main>
  );
}
