"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { Bird, Cat, Check, Feather, Flame, Medal, Play, Rabbit, Turtle, Users, Wind, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getNextMission, countCompletedMissions, countPlayableMissions } from "@/features/levels/levelProgress";
import {
  apprenticeAvatarIds,
  defaultApprenticeAvatarId,
  type ApprenticeAvatarId
} from "@/features/profile/apprenticeAvatar";
import { useProgress } from "@/features/progress/ProgressProvider";
import { Link, useRouter } from "@/i18n/navigation";
import styles from "./HomeLanding.module.css";

const apprenticeAvatarIcons: Record<ApprenticeAvatarId, LucideIcon> = {
  eagle: Bird,
  fox: Wind,
  rabbit: Rabbit,
  turtle: Turtle,
  owl: Feather,
  cat: Cat
};

/**
 * Entry point of the game, in two steps.
 *
 * First the player picks an apprentice and enters a local display name. Then Roqui takes
 * over the whole screen and introduces the problem one line at a time; a tap anywhere
 * moves on, and the last one opens mission 1.
 */
export function HomeLanding() {
  const t = useTranslations("home");
  const tIslands = useTranslations("islands");
  const router = useRouter();
  const nameFieldId = useId();
  const {
    hydrated,
    onboarded,
    markOnboarded,
    progressState,
    playerName: savedPlayerName,
    apprenticeAvatarId: savedApprenticeAvatarId
  } = useProgress();

  const lines = t.raw("dialogue") as string[];
  const apprenticeNames = t.raw("profileAvatars") as string[];

  const [step, setStep] = useState<"account" | "intro">("account");
  const [lineIndex, setLineIndex] = useState(0);
  const [apprenticeAvatarId, setApprenticeAvatarId] = useState<ApprenticeAvatarId>(defaultApprenticeAvatarId);
  const [playerName, setPlayerName] = useState("");

  // Nothing is rendered until the stored progress is known, so a returning player never
  // sees the sign-up screen flash before their own home.
  if (!hydrated) {
    return <div className={`${styles.splash} app-chrome-hidden`} />;
  }

  /*
   * A player who already signed up gets their own home instead of onboarding again.
   * While the introduction is still on screen the hub must not take over: signing up
   * flips `onboarded` immediately, and the hub would flash before the route changes.
   */
  if (onboarded && step !== "intro") {
    const done = countCompletedMissions(progressState);
    const total = countPlayableMissions();
    const nextMission = getNextMission(progressState);
    const ranks = t.raw("hubRanks") as string[];
    const rank = ranks[Math.min(Math.floor(done / 2), ranks.length - 1)];
    const hubApprenticeAvatarId = savedApprenticeAvatarId ?? defaultApprenticeAvatarId;
    const HubApprenticeIcon = apprenticeAvatarIcons[hubApprenticeAvatarId];

    return (
      <div className={styles.landing}>
        <section aria-labelledby="hub-title" className={styles.hub}>
          <div className={styles.hubHeader}>
            <h1 className={styles.hubGreeting} id="hub-title">
              {savedPlayerName ? t("hubGreetingNamed", { name: savedPlayerName }) : t("hubGreeting")}
            </h1>
            <span
              aria-label={t("profileAvatarAria", {
                name: apprenticeNames[apprenticeAvatarIds.indexOf(hubApprenticeAvatarId)]
              })}
              className={styles.hubApprentice}
              role="img"
            >
              <HubApprenticeIcon aria-hidden="true" strokeWidth={2} />
            </span>
          </div>

          <div className={styles.hubNext}>
            {nextMission ? (
              <>
                <p className={styles.hubNextLabel}>{t("hubContinueLabel")}</p>
                <p className={styles.hubNextTitle}>{tIslands(`categories.${nextMission.category}.title`)}</p>
                <Link className={styles.primaryAction} href={`/level/${nextMission.id}`}>
                  <Play aria-hidden="true" size={17} fill="currentColor" />
                  {t("hubContinue")}
                </Link>
              </>
            ) : (
              <>
                <p className={styles.hubNextTitle}>{t("hubAllDone")}</p>
                <Link className={styles.primaryAction} href="/worlds">
                  {t("hubMap")}
                </Link>
              </>
            )}
          </div>

          <p className={styles.progress}>
            <span className={styles.progressLabel}>{t("progressLabel")}</span>
            <span aria-hidden="true" className={styles.progressTrack}>
              <span className={styles.progressFill} style={{ width: `${(done / total) * 100}%` }} />
            </span>
            <span className={styles.progressValue}>{t("progressValue", { done, total })}</span>
          </p>

          <ul className={styles.hubStats}>
            <li className={styles.hubStat}>
              <span className={`${styles.hubStatIcon} ${styles.hubStatRank}`}>
                <Medal aria-hidden="true" size={20} />
              </span>
              <span className={styles.hubStatLabel}>{t("hubRank")}</span>
              <span className={styles.hubStatValue}>{rank}</span>
            </li>
            <li className={styles.hubStat}>
              <span className={`${styles.hubStatIcon} ${styles.hubStatStreak}`}>
                <Flame aria-hidden="true" size={20} />
              </span>
              <span className={styles.hubStatLabel}>{t("hubStreak")}</span>
              <span className={styles.hubStatSoon}>{t("hubSoon")}</span>
            </li>
            <li className={styles.hubStat}>
              <span className={`${styles.hubStatIcon} ${styles.hubStatFriends}`}>
                <Users aria-hidden="true" size={20} />
              </span>
              <span className={styles.hubStatLabel}>{t("hubFriends")}</span>
              <span className={styles.hubStatSoon}>{t("hubSoon")}</span>
            </li>
          </ul>
        </section>
      </div>
    );
  }

  if (step === "intro") {
    const isLastLine = lineIndex >= lines.length - 1;

    return (
      /* Fixed and above the app chrome, so the header and the bottom bar are covered
         and the introduction feels like its own moment. */
      <button
        aria-label={t("dialogueAria", { current: lineIndex + 1, total: lines.length })}
        className={`${styles.intro} app-chrome-hidden`}
        type="button"
        onClick={() => {
          if (!isLastLine) {
            setLineIndex((index) => index + 1);
            return;
          }
          markOnboarded(playerName || t("profileNamePlaceholder"), apprenticeAvatarId);
          router.push("/tutorial");
        }}
      >
        <span className={styles.introStage}>
          <span className={styles.introBubble}>
            <span className={styles.line}>{lines[lineIndex]}</span>
          </span>

          <span className={styles.introMascot}>
            <Image
              alt={t("mascotAlt")}
              height={1024}
              priority
              sizes="(max-width: 480px) 62vw, 22rem"
              src="/media/mascot/roqui-detective.png"
              width={1024}
            />
          </span>

          <span aria-hidden="true" className={styles.dots}>
            {lines.map((line, index) => (
              <span className={`${styles.dot} ${index <= lineIndex ? styles.dotSeen : ""}`} key={line} />
            ))}
          </span>

          <span aria-hidden="true" className={styles.introHint}>
            {t("dialogueNext")}
          </span>
        </span>

        <span aria-live="polite" className={styles.srOnly}>
          {lines[lineIndex]}
        </span>
      </button>
    );
  }

  return (
    /* The account screen is the entry point: there is no session and nothing to
       navigate to yet, so the header and the bottom bar stay hidden. */
    <div className={`${styles.landing} app-chrome-hidden`}>
      <div className={styles.accountLanguage}>
        <LanguageSwitcher />
      </div>

      <section aria-labelledby="account-title" className={styles.profile}>
        <h1 className={styles.profileTitle} id="account-title">
          {t("profileTitle")}
        </h1>

        <fieldset className={styles.field}>
          <legend className={styles.fieldLabel}>{t("profileAvatar")}</legend>
          <div className={styles.badges}>
            {apprenticeAvatarIds.map((avatarId, index) => {
              const Icon = apprenticeAvatarIcons[avatarId];
              const avatar = apprenticeNames[index] ?? avatarId;
              const isSelected = avatarId === apprenticeAvatarId;
              return (
                <button
                  aria-label={t("profileAvatarAria", { name: avatar })}
                  aria-pressed={isSelected}
                  className={`${styles.badge} ${isSelected ? styles.badgeSelected : ""}`}
                  key={avatarId}
                  type="button"
                  onClick={() => setApprenticeAvatarId(avatarId)}
                >
                  <Icon aria-hidden="true" size={26} strokeWidth={2.1} />
                  {isSelected && (
                    <span aria-hidden="true" className={styles.badgeCheck}>
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor={nameFieldId}>
            {t("profileNameLabel")}
          </label>
          <input
            autoComplete="off"
            className={styles.nameInput}
            id={nameFieldId}
            maxLength={24}
            placeholder={t("profileNamePlaceholder")}
            type="text"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
          />
        </div>

        <button className={styles.primaryAction} type="button" onClick={() => setStep("intro")}>
          {t("profileSubmit")}
        </button>

        <p className={styles.profileNote}>{t("profileAdultNote")}</p>

        <p className={styles.signIn}>
          {t("profileHasAccount")}{" "}
          <button className={styles.signInAction} type="button" onClick={() => setStep("intro")}>
            {t("profileSignIn")}
          </button>
        </p>
      </section>
    </div>
  );
}
