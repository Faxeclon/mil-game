import { setRequestLocale } from "next-intl/server";
import { PageContainer } from "@/components/PageContainer";
import { TeacherJoinClient } from "@/components/TeacherJoinClient";

export default async function TeacherJoinPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main id="main-content">
      <PageContainer>
        <TeacherJoinClient />
      </PageContainer>
    </main>
  );
}
