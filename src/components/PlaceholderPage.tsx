import { Construction } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LargeActionButton } from "@/components/LargeActionButton";
import { PageContainer } from "@/components/PageContainer";

type PlaceholderPageProps = { title: string; description: string; actionLabel: string; href: "/" | "/worlds" };

export async function PlaceholderPage({ title, description, actionLabel, href }: PlaceholderPageProps) {
  const t = await getTranslations("placeholder");
  return (
    <main id="main-content">
      <PageContainer className="placeholder-shell">
        <section className="placeholder-card" aria-labelledby="placeholder-title">
          <Construction aria-hidden="true" size={42} />
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1 id="placeholder-title">{title}</h1>
          <p>{description}</p>
          <LargeActionButton href={href}>{actionLabel}</LargeActionButton>
        </section>
      </PageContainer>
    </main>
  );
}

