"use client";

import Image from "next/image";
import { useId, useState } from "react";
import {
  Bird,
  Cat,
  Check,
  Feather,
  Flame,
  GraduationCap,
  Medal,
  Play,
  Rabbit,
  ShieldCheck,
  Smartphone,
  Swords,
  Turtle,
  UserPlus,
  Users,
  Wind,
  Zap,
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
import { useTeacherAccount } from "@/features/teacher/teacherAccountStore";
import { MAX_LOCAL_PROFILES } from "@/features/profiles/localProfiles";
import { getLocalStandings, getPlayerRank } from "@/features/ranks/playerRank";
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
  const tProfiles = useTranslations("profiles");
  const tRank = useTranslations("rank");
  const tRush = useTranslations("rush");
  const tGuardian = useTranslations("guardian");
  const tTeacherAccount = useTranslations("teacherAccount");
  const router = useRouter();
  const nameFieldId = useId();
  const {
    hydrated,
    onboarded,
    markOnboarded,
    progressState,
    localNickname: savedLocalNickname,
    apprenticeAvatarId: savedApprenticeAvatarId,
    profiles,
    guardian,
    addProfile,
    selectProfile
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
  const [playerChosen, setPlayerChosen] = useState(false);
  const { account: teacherAccount } = useTeacherAccount();

  // Nothing is rendered until the stored progress is known, so a returning player never
  // sees the sign-up screen flash before their own home.
  if (!hydrated) {
    return <div className={`${styles.splash} app-chrome-hidden`} />;
  }

  /*
   * More than one child shares this phone, so it asks who is holding it before anything
   * else. With a single player there is no question to ask and no screen appears: a
   * seven-year-old should never meet a decision before they meet the game.
   */
  if (profiles.profiles.length > 1 && !playerChosen && step !== "intro") {
    return (
      <div className={`${styles.landing} app-chrome-hidden`}>
        <section aria-labelledby="who-plays-title" className={styles.profile}>
          <h1 className={styles.profileTitle} id="who-plays-title">
            {tProfiles("whoPlays")}
          </h1>
          <p className={styles.profileNote}>{tProfiles("whoPlaysHint")}</p>

          <ul className={styles.playerList}>
            {profiles.profiles.map((profile, index) => {
              const Icon = apprenticeAvatarIcons[profile.progress.apprenticeAvatarId ?? defaultApprenticeAvatarId];
              const done = profile.progress.completedLevelIds.length;

              return (
                <li key={profile.id}>
                  <button
                    className={`${styles.playerCard} ${profile.id === profiles.activeId ? styles.playerCurrent : ""}`}
                    type="button"
                    onClick={() => {
                      selectProfile(profile.id);
                      setPlayerChosen(true);
                    }}
                  >
                    <span className={styles.playerIcon}>
                      <Icon aria-hidden="true" size={24} strokeWidth={2} />
                    </span>
                    <span className={styles.playerText}>
                      <span className={styles.playerName}>
                        {profile.progress.localNickname ?? tProfiles("unnamed", { number: index + 1 })}
                      </span>
                      <span className={styles.playerDetail}>{tProfiles("playerMissions", { count: done })}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {profiles.profiles.length < MAX_LOCAL_PROFILES && (
            <button
              className={styles.addPlayer}
              type="button"
              onClick={() => {
                addProfile();
                setPlayerChosen(true);
              }}
            >
              <UserPlus aria-hidden="true" size={16} />
              {tProfiles("addPlayer")}
            </button>
          )}

          <p className={styles.profileNote}>{tProfiles("separateNote")}</p>
        </section>
      </div>
    );
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
    const rank = getPlayerRank(progressState);
    const standings = getLocalStandings(profiles.profiles);
    const hubApprenticeAvatarId = savedApprenticeAvatarId ?? defaultApprenticeAvatarId;
    const HubApprenticeIcon = apprenticeAvatarIcons[hubApprenticeAvatarId];

    return (
      <div className={styles.landing}>
        <section aria-labelledby="hub-title" className={styles.hub}>
          <div className={styles.hubHeader}>
            <h1 className={styles.hubGreeting} id="hub-title">
              {savedLocalNickname ? t("hubGreetingNamed", { name: savedLocalNickname }) : t("hubGreeting")}
            </h1>
            <p className={styles.hubTitleBadge}>{tRank(`titles.${rank.titleKey}`)}</p>
            {/* Telling a child where their data lives is itself a media-literacy lesson:
                the app practises what it teaches, and never claims nothing is stored.
                Once an adult has authorised, the badge says so instead. */}
            {guardian ? (
              <span className={`${styles.guestBadge} ${styles.guardianBadge}`}>
                <ShieldCheck aria-hidden="true" size={13} />
                {tGuardian("badge")}
              </span>
            ) : (
              <span aria-label={tStorage("guestBadgeAria")} className={styles.guestBadge} role="img">
                <Smartphone aria-hidden="true" size={13} />
                {tStorage("guestBadge")}
              </span>
            )}
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
            {/* Worked out from the stars already on the map, so it can never claim more
                than the player earned, and it is never a position against other children. */}
            <li className={`${styles.hubStat} ${rank.tier ? styles.hubStatLive : ""}`}>
              <span className={`${styles.hubStatIcon} ${styles.hubStatRank}`}>
                <Medal aria-hidden="true" size={20} />
              </span>
              <span className={styles.hubStatLabel}>{t("hubRank")}</span>
              <span className={styles.hubStatValue}>
                {rank.tier ? tRank(`tiers.${rank.tier}`) : tRank("none")}
              </span>
              <span className={styles.hubStatDetail}>
                {rank.tier ? tRank("stars", { stars: rank.stars, max: rank.maxStars }) : tRank("noneHint")}
              </span>
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

          {/* Kept next to versus rather than on the map: it is a side attraction and
              awards nothing, so it must not look like part of the learning route. */}
          <Link className={styles.versusCard} href="/rush">
            <span className={styles.versusIcon}>
              <Zap aria-hidden="true" size={20} />
            </span>
            <span className={styles.versusText}>
              <span className={styles.versusTitle}>{tRush("title")}</span>
              <span className={styles.versusLead}>{tRush("notAMission")}</span>
            </span>
          </Link>

          {/* The only comparison the game makes: between the children of this phone,
              sitting next to each other. No server, no strangers, no league. */}
          {standings.length > 1 && (
            <section aria-labelledby="standings-title" className={styles.standings}>
              <h2 className={styles.standingsTitle} id="standings-title">
                {tRank("standingsTitle")}
              </h2>
              <ol className={styles.standingsList}>
                {standings.map((entry, index) => (
                  <li
                    className={`${styles.standing} ${entry.profileId === profiles.activeId ? styles.standingYou : ""}`}
                    key={entry.profileId}
                  >
                    <span className={styles.standingPosition}>{tRank("position", { position: index + 1 })}</span>
                    <span className={styles.standingName}>
                      {entry.nickname ?? tProfiles("unnamed", { number: index + 1 })}
                    </span>
                    <span className={styles.standingStars}>
                      {tRank("stars", { stars: entry.rank.stars, max: entry.rank.maxStars })}
                    </span>
                  </li>
                ))}
              </ol>
              <p className={styles.standingsNote}>{tRank("standingsLead")}</p>
            </section>
          )}

          <p className={styles.guestNotice}>
            {guardian ? tGuardian("grantedPending") : tStorage("guestNotice")}
          </p>
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

        {/*
          A teacher who registered on this device is not a player. Sending them to make a
          child's profile before they can reach their own tools would be asking the wrong
          question, so the way out is offered plainly instead of hidden.
        */}
        {teacherAccount ? (
          <Link className={styles.teacherCard} href="/teacher">
            <span className={styles.teacherCardIcon}>
              <GraduationCap aria-hidden="true" size={20} />
            </span>
            <span className={styles.teacherCardText}>
              <span className={styles.teacherCardTitle}>{tTeacherAccount("navLabel")}</span>
              <span className={styles.teacherCardLead}>{tTeacherAccount("goToTools")}</span>
            </span>
          </Link>
        ) : (
          <Link className={styles.teacherLink} href="/teacher/join">
            {tTeacherAccount("imTeacher")}
          </Link>
        )}
      </section>
    </div>
  );
}
