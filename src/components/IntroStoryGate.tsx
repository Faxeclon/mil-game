"use client";

import type { ReactNode } from "react";
import { useProgress } from "@/features/progress/ProgressProvider";
import { IntroStory } from "./IntroStory";

/**
 * Islands is the voluntary entry point for the narrative prologue. Keeping this beside
 * the route's existing profile guard leaves Home and every other section available until
 * the player deliberately opens the map.
 */
export function IntroStoryGate({ children }: { children: ReactNode }) {
  const { introStorySeen, markIntroStorySeen } = useProgress();

  if (introStorySeen) return <>{children}</>;
  return <IntroStory onComplete={markIntroStorySeen} />;
}
