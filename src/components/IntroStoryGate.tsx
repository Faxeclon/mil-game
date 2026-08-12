"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { getIntroStoryAccess } from "@/features/onboarding/introStoryAccess";
import { useProgress } from "@/features/progress/ProgressProvider";
import { IntroStory } from "./IntroStory";
import { LoadingRoqui } from "./LoadingRoqui";

/**
 * Islands is the voluntary entry point for the narrative prologue. Keeping this beside
 * the route's existing profile guard leaves Home and every other section available until
 * the player deliberately opens the map.
 */
export function IntroStoryGate({ children }: { children: ReactNode }) {
  const t = useTranslations("locked");
  const { hydrated, introStorySeen, markIntroStorySeen } = useProgress();
  const access = getIntroStoryAccess(hydrated, introStorySeen);

  if (access === "checking") return <LoadingRoqui message={t("checking")} title={t("title")} />;
  if (access === "story") return <IntroStory onComplete={markIntroStorySeen} />;
  return <>{children}</>;
}
