import { setRequestLocale } from "next-intl/server";
import { PageContainer } from "@/components/PageContainer";
import { TeacherClient } from "@/components/TeacherClient";

export default async function TeacherPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main id="main-content">
      <PageContainer>
        <TeacherClient />
      </PageContainer>
    </main>
  );
}
