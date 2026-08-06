"use client";

import Image from "next/image";
import { useId, useState } from "react";
import {
  Bird,
  Cat,
  Check,
  Feather,
  Flame,
  Medal,
  Play,
  Rabbit,
  Smartphone,
  Swords,
  Turtle,
  Users,
  Wind,
  type LucideIcon
} from "lucide-react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getAvailableIsland, getNextMission } from "@/features/levels/levelProgress";
import { getGlobalProgress } from "@/features/levels/progressSummary";
import {
  apprenticeAvatarIds,
  defaultApprenticeAvatarId,
  type ApprenticeAvatarId
} from "@/features/profile/apprenticeAvatar";
import { normalizeLocalNickname } from "@/features/profile/localNickname";
import { needsLocalNicknameCompletion } from "@/features/progress/progressState";
import { getLocalPlayedOn, getStreakToday } from "@/features/progress/streak";
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
  const tStorage = useTranslations("storage");
  const tVersus = useTranslations("versus");
  const router = useRouter();
  const nameFieldId = useId();
  const {
    hydrated,
    onboarded,
    markOnboarded,
    progressState,
    localNickname: savedLocalNickname,
    apprenticeAvatarId: savedApprenticeAvatarId
  } = useProgress();

  const lines = t.raw("dialogue") as string[];
  const apprenticeNames = t.raw("profileAvatars") as string[];

  const [step, setStep] = useState<"account" | "intro">("account");
  const [lineIndex, setLineIndex] = useState(0);
  const [apprenticeAvatarId, setApprenticeAvatarId] = useState<ApprenticeAvatarId>(defaultApprenticeAvatarId);
  const [localNickname, setLocalNickname] = useState("");
  const [nicknameError, setNicknameError] = useState(false);
  // Read once per mount: the hub only renders after hydration, so the device clock is
  // available here and the streak cannot differ between server and client markup.
  const [today] = useState(() => getLocalPlayedOn(new Date()));

  // Nothing is rendered until the stored progress is known, so a returning player never
  // sees the sign-up screen flash before their own home.
  if (!hydrated) {
    return <div className={`${styles.splash} app-chrome-hidden`} />;
  }

  /*
   * A player with a completed local profile gets their own home instead of onboarding again.
   * While the introduction is still on screen the hub must not take over: signing up
   * flips `onboarded` immediately, and the hub would flash before the route changes.
   */
  if (onboarded && !needsLocalNicknameCompletion(progressState) && step !== "intro") {
    const overall = getGlobalProgress(progressState);
    const nextMission = getNextMission(progressState);
    const activeIsland = getAvailableIsland(progressState);
    const streak = today ? getStreakToday(progressState.streak, today) : progressState.streak;
    const hubApprenticeAvatarId = savedApprenticeAvatarId ?? defaultApprenticeAvatarId;
    const HubApprenticeIcon = apprenticeAvatarIcons[hubApprenticeAvatarId];

    return (
      <div className={styles.landing}>
        <section aria-labelledby="hub-title" className={styles.hub}>
          <div className={styles.hubHeader}>
            <h1 className={styles.hubGreeting} id="hub-title">
              {savedLocalNickname ? t("hubGreetingNamed", { name: savedLocalNickname }) : t("hubGreeting")}
            </h1>
            {/* Telling a child where their data lives is itself a media-literacy lesson:
                the app practises what it teaches, and never claims nothing is stored. */}
            <span aria-label={tStorage("guestBadgeAria")} className={styles.guestBadge} role="img">
              <Smartphone aria-hidden="true" size={13} />
              {tStorage("guestBadge")}
            </span>
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

          <div className={styles.progress}>
            <span className={styles.progressLabel}>{t("progressLabel")}</span>
            <div
              aria-label={t("progressAria", { done: overall.done, total: overall.total })}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={overall.percent}
              aria-valuetext={t("progressPercent", { percent: overall.percent })}
              className={styles.progressTrack}
              role="progressbar"
            >
              <span className={styles.progressFill} style={{ width: `${overall.percent}%` }} />
            </div>
            <span className={styles.progressValue}>
              {t("progressValue", { done: overall.done, total: overall.total })}
              {" · "}
              {t("progressPercent", { percent: overall.percent })}
            </span>
          </div>

          {activeIsland && (
            <p className={styles.hubIsland}>
              <span className={styles.hubIslandLabel}>{t("hubIslandLabel")}</span>
              <span className={styles.hubIslandName}>{tIslands(`list.${activeIsland}.title`)}</span>
            </p>
          )}

          <ul className={styles.hubStats}>
            <li className={styles.hubStat}>
              <span className={`${styles.hubStatIcon} ${styles.hubStatRank}`}>
                <Medal aria-hidden="true" size={20} />
              </span>
              <span className={styles.hubStatLabel}>{t("hubRank")}</span>
              <span className={styles.hubStatSoon}>{t("hubSoon")}</span>
            </li>
            <li className={`${styles.hubStat} ${streak.currentDays > 0 ? styles.hubStatLive : ""}`}>
              <span className={`${styles.hubStatIcon} ${styles.hubStatStreak}`}>
                <Flame aria-hidden="true" size={20} />
              </span>
              <span className={styles.hubStatLabel}>{t("hubStreak")}</span>
              {/* Read for today, so a streak broken while the app was closed shows as broken. */}
              <span className={styles.hubStatValue}>
                {streak.currentDays > 0 ? t("streakDays", { days: streak.currentDays }) : t("streakNone")}
              </span>
              {streak.bestDays > 0 && (
                <span className={styles.hubStatDetail}>{t("streakBest", { days: streak.bestDays })}</span>
              )}
            </li>
            <li className={styles.hubStat}>
              <span className={`${styles.hubStatIcon} ${styles.hubStatFriends}`}>
                <Users aria-hidden="true" size={20} />
              </span>
              <span className={styles.hubStatLabel}>{t("hubFriends")}</span>
              <span className={styles.hubStatSoon}>{t("hubSoon")}</span>
            </li>
          </ul>

          {/* Built for the shared family phone, so it sits next to the solo path, not
              behind an account or a connection. */}
          <Link className={styles.versusCard} href="/versus">
            <span className={styles.versusIcon}>
              <Swords aria-hidden="true" size={20} />
            </span>
            <span className={styles.versusText}>
              <span className={styles.versusTitle}>{tVersus("title")}</span>
              <span className={styles.versusLead}>{tVersus("lead")}</span>
            </span>
          </Link>

          <p className={styles.guestNotice}>{tStorage("guestNotice")}</p>
        </section>
      </div>
    );
  }

  if (needsLocalNicknameCompletion(progressState) && step !== "intro") {
    return (
      <div className={`${styles.landing} app-chrome-hidden`}>
        <div className={styles.accountLanguage}>
          <LanguageSwitcher />
        </div>
        <section aria-labelledby="nickname-completion-title" className={styles.profile}>
          <h1 className={styles.profileTitle} id="nickname-completion-title">
            {t("profileCompletionTitle")}
          </h1>
          <p className={styles.profileNote}>{t("profileLocalNote")}</p>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor={nameFieldId}>
              {t("profileNicknameLabel")}
            </label>
            <input
              aria-describedby={`${nameFieldId}-hint${nicknameError ? ` ${nameFieldId}-error` : ""}`}
              autoComplete="off"
              className={styles.nameInput}
              id={nameFieldId}
              maxLength={24}
              type="text"
              value={localNickname}
              onChange={(event) => {
                setLocalNickname(event.target.value);
                setNicknameError(false);
              }}
            />
            <p className={styles.profileHint} id={`${nameFieldId}-hint`}>
              {t("profileNicknameHint")}
            </p>
            {nicknameError && (
              <p className={styles.profileError} id={`${nameFieldId}-error`} role="alert">
                {t("profileNicknameRequired")}
              </p>
            )}
          </div>
          <button
            className={styles.primaryAction}
            type="button"
            onClick={() => {
              const nickname = normalizeLocalNickname(localNickname);
              if (!nickname) {
                setNicknameError(true);
                return;
              }
              markOnboarded(nickname);
            }}
          >
            {t("profileCompletionSubmit")}
          </button>
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
          markOnboarded(localNickname, apprenticeAvatarId);
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
    /* The local profile screen is the entry point, so the header and bottom bar stay hidden. */
    <div className={`${styles.landing} app-chrome-hidden`}>
      <div className={styles.accountLanguage}>
        <LanguageSwitcher />
      </div>

      <section aria-labelledby="profile-title" className={styles.profile}>
        <h1 className={styles.profileTitle} id="profile-title">
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
            {t("profileNicknameLabel")}
          </label>
          <input
            aria-describedby={`${nameFieldId}-hint${nicknameError ? ` ${nameFieldId}-error` : ""}`}
            autoComplete="off"
            className={styles.nameInput}
            id={nameFieldId}
            maxLength={24}
            type="text"
            value={localNickname}
            onChange={(event) => {
              setLocalNickname(event.target.value);
              setNicknameError(false);
            }}
          />
          <p className={styles.profileHint} id={`${nameFieldId}-hint`}>
            {t("profileNicknameHint")}
          </p>
          {nicknameError && (
            <p className={styles.profileError} id={`${nameFieldId}-error`} role="alert">
              {t("profileNicknameRequired")}
            </p>
          )}
        </div>

        <button
          className={styles.primaryAction}
          type="button"
          onClick={() => {
            const nickname = normalizeLocalNickname(localNickname);
            if (!nickname) {
              setNicknameError(true);
              return;
            }
            setLocalNickname(nickname);
            setStep("intro");
          }}
        >
          {t("profileSubmit")}
        </button>

        <p className={styles.profileNote}>{t("profileLocalNote")}</p>
      </section>
    </div>
  );
}
