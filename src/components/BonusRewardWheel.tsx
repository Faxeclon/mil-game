"use client";

import { Gift, RotateCw, ShieldPlus, Sparkles, Timer } from "lucide-react";
import { useRef, useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import {
  bonusWheelSegments,
  type BonusOpportunity,
  type BonusWheelSegment,
  type BonusWheelState
} from "@/features/bonus/bonusOpportunity";
import { useAccessibility } from "@/features/accessibility/accessibilityStore";
import { useProgress } from "@/features/progress/ProgressProvider";
import styles from "./BonusRewardWheel.module.css";

const rewardKeys = {
  "extra-life": "extraLife",
  "double-points": "doublePoints",
  "extra-15": "extra15",
  "extra-10": "extra10",
  none: "none",
  reroll: "reroll"
} as const;

function segmentFromWheel(wheel: BonusWheelState | undefined): BonusWheelSegment | undefined {
  if (!wheel || wheel.status === "pending") return undefined;
  return wheel.status === "reroll" ? "reroll" : wheel.reward;
}

function RewardIcon({ segment }: { segment: BonusWheelSegment }) {
  if (segment === "extra-life") return <ShieldPlus aria-hidden="true" />;
  if (segment === "double-points") return <Sparkles aria-hidden="true" />;
  if (segment === "extra-15" || segment === "extra-10") return <Timer aria-hidden="true" />;
  if (segment === "reroll") return <RotateCw aria-hidden="true" />;
  return <Gift aria-hidden="true" />;
}

/** A persisted pre-game wheel. Its selected segment is written before any movement starts. */
export function BonusRewardWheel({ bonus, onContinue }: { bonus: BonusOpportunity; onContinue: () => void }) {
  const t = useTranslations("rush");
  const { reducedMotion } = useAccessibility();
  const { spinBonusWheel } = useProgress();
  const [spinning, setSpinning] = useState(false);
  const spinLock = useRef(false);
  const selected = segmentFromWheel(bonus.wheel);
  const selectedIndex = selected ? bonusWheelSegments.indexOf(selected) : 0;
  const pending = !bonus.wheel || bonus.wheel.status === "pending";
  const canSpin = pending || bonus.wheel?.status === "reroll";

  const spin = () => {
    if (!canSpin || spinning || spinLock.current) return;
    spinLock.current = true;
    // The store commits first; a reload from this point can only show this chosen result.
    const wheel = spinBonusWheel(bonus.id);
    if (!wheel || wheel.status === "pending") {
      spinLock.current = false;
      return;
    }
    setSpinning(true);
    window.setTimeout(() => {
      spinLock.current = false;
      setSpinning(false);
    }, reducedMotion ? 0 : 900);
  };

  const rotation = selected ? 1_080 + (360 - selectedIndex * 60 - 30) : 0;
  const wheelStyle = { "--wheel-rotation": `${rotation}deg` } as CSSProperties;

  return (
    <section aria-labelledby="bonus-wheel-title" className={styles.panel}>
      <h1 id="bonus-wheel-title">{t("wheelTitle")}</h1>
      <p className={styles.lead}>{t("wheelLead")}</p>
      <div className={styles.wheelWrap}>
        <span aria-hidden="true" className={styles.pointer} />
        <div
          aria-label={selected ? t("wheelSelected", { reward: t(`wheelRewards.${rewardKeys[selected]}`) }) : t("wheelAria")}
          className={`${styles.wheel} ${spinning ? styles.spinning : ""} ${reducedMotion ? styles.reducedMotion : ""}`}
          role="img"
          style={wheelStyle}
        >
          {bonusWheelSegments.map((segment, index) => (
            <span className={styles.segmentLabel} key={segment} style={{ "--segment-index": index } as CSSProperties}>
              {t(`wheelRewards.${rewardKeys[segment]}`)}
            </span>
          ))}
        </div>
      </div>
      {selected && (
        <div aria-live="polite" className={styles.result}>
          <span>{t("wheelYourBonus")}</span>
          <strong><RewardIcon segment={selected} />{t(`wheelRewards.${rewardKeys[selected]}`)}</strong>
        </div>
      )}
      {canSpin && !spinning && (
        <button className={styles.primary} type="button" onClick={spin}>
          <RotateCw aria-hidden="true" />
          {bonus.wheel?.status === "reroll" ? t("wheelSpinAgain") : t("wheelSpin")}
        </button>
      )}
      {selected && bonus.wheel?.status === "resolved" && !spinning && (
        <button autoFocus className={styles.primary} type="button" onClick={onContinue}>
          {t("wheelContinue")}
        </button>
      )}
    </section>
  );
}
