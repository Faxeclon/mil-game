import { setRequestLocale } from "next-intl/server";
import { PageContainer } from "@/components/PageContainer";
import { TeacherRouteGuard } from "@/components/TeacherRouteGuard";
import { TeacherScanClient } from "@/components/TeacherScanClient";

export default async function TeacherScanPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main id="main-content">
      <PageContainer>
        <TeacherRouteGuard>
          <TeacherScanClient />
        </TeacherRouteGuard>
      </PageContainer>
    </main>
  );
}
