"use client";

import { Eye, HelpCircle, Search } from "lucide-react";
import { useTranslations } from "next-intl";

export type LearningStep = "look" | "ask" | "check";
export type LearningStepState = "inactive" | "active" | "highlighted";

type LookAskCheckProps = {
  states: Record<LearningStep, LearningStepState>;
};

const steps = [
  { id: "look", icon: Eye },
  { id: "ask", icon: HelpCircle },
  { id: "check", icon: Search }
] as const;

export function LookAskCheck({ states }: LookAskCheckProps) {
  const t = useTranslations("tutorial");
  return (
    <ol className="look-ask-check" aria-label={t("modelAria")}>
      {steps.map(({ id, icon: Icon }) => (
        <li className={`look-ask-check__step look-ask-check__step--${states[id]}`} key={id}>
          <Icon aria-hidden="true" size={22} strokeWidth={2.5} />
          <span>{t(id)}</span>
        </li>
      ))}
    </ol>
  );
}

