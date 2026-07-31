"use client";

import type { CSSProperties } from "react";
import { Eye, HelpCircle, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import type { LearningStep, LearningStepState } from "@/features/game/tutorialPresentation";
import styles from "./LookAskCheck.module.css";

export type { LearningStep, LearningStepState };

type LookAskCheckProps = {
  states: Record<LearningStep, LearningStepState>;
  /** Denser spacing for the in-round feedback panel. */
  compact?: boolean;
  /** Reveals the steps one after another; used once on the completion screen. */
  sequential?: boolean;
};

const steps = [
  { id: "look", icon: Eye },
  { id: "ask", icon: HelpCircle },
  { id: "check", icon: Search }
] as const;

export function LookAskCheck({ states, compact = false, sequential = false }: LookAskCheckProps) {
  const t = useTranslations("tutorial");
  const trackClassName = [styles.track, compact ? styles.compact : "", sequential ? styles.sequential : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <ol aria-label={t("modelAria")} className={trackClassName}>
      {steps.map(({ id, icon: Icon }, index) => {
        const state = states[id];
        return (
          <li
            aria-current={state === "active" ? "step" : undefined}
            className={`${styles.step} ${styles[state]}`}
            key={id}
            style={{ "--step-index": index } as CSSProperties}
          >
            <span aria-hidden="true" className={styles.marker}>
              <Icon size={compact ? 14 : 16} strokeWidth={2.5} />
            </span>
            <span className={styles.label}>{t(id)}</span>
            {state !== "inactive" && (
              <span className={styles.srOnly}>{state === "active" ? t("stepCurrent") : t("stepCompleted")}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
