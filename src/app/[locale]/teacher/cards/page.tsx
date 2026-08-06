import { setRequestLocale } from "next-intl/server";
import { PageContainer } from "@/components/PageContainer";
import { TeacherCardsClient } from "@/components/TeacherCardsClient";

export default async function TeacherCardsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main id="main-content">
      <PageContainer>
        <TeacherCardsClient />
      </PageContainer>
    </main>
  );
}
