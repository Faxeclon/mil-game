"use client";

import Image from "next/image";
import { useId, useState } from "react";
import {
  Bird,
  BookOpenCheck,
  Cat,
  Check,
  Feather,
  Flame,
  Medal,
  Play,
  QrCode,
  Rabbit,
  Swords,
  Turtle,
  Users,
  Wind,
  type LucideIcon
} from "lucide-react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Narrator } from "@/components/Narrator";
import { MascotSlot } from "@/features/mascot/MascotSlot";
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
import { readClassSet } from "@/features/teacher/classSetStorage";
import { useAdultAccount } from "@/features/adults/adultAccountStore";
import { getChildrenOf } from "@/features/adults/childrenOfAdult";
import { countFriends } from "@/features/friends/friendsModel";
import { useFriends } from "@/features/friends/friendsStore";
import { getPlayerRank } from "@/features/ranks/playerRank";
import { useProgress } from "@/features/progress/ProgressProvider";
import { Link, useRouter } from "@/i18n/navigation";
import { enableSoundForNewProfile } from "@/features/audio/soundPreference";
import { useBackgroundMusic } from "./BackgroundMusicProvider";
import { AdultPlayLink } from "./AdultPlayLink";
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
  const tVersus = useTranslations("versus");
  const tFriends = useTranslations("friends");
  const tAdult = useTranslations("adult");
  const friendCount = countFriends(useFriends().document);
  const tRank = useTranslations("rank");
  const tGuardian = useTranslations("guardian");
  const tTeacherAccount = useTranslations("teacherAccount");
  const tCards = useTranslations("cards");
  const router = useRouter();
  const { enableForNewProfile } = useBackgroundMusic();
  const nameFieldId = useId();
  const {
    hydrated,
    onboarded,
    markOnboarded,
    progressState,
    localNickname: savedLocalNickname,
    apprenticeAvatarId: savedApprenticeAvatarId,
    guardian,
    savedProfiles
  } = useProgress();

  const lines = t.raw("dialogue") as string[];
  const apprenticeNames = t.raw("profileAvatars") as string[];

  const step = "account" as "account" | "intro";
  const [lineIndex, setLineIndex] = useState(0);
  const [apprenticeAvatarId, setApprenticeAvatarId] = useState<ApprenticeAvatarId>(defaultApprenticeAvatarId);
  const [localNickname, setLocalNickname] = useState("");
  const [nicknameError, setNicknameError] = useState(false);
  const [creatingProfile, setCreatingProfile] = useState(false);
  // Read once per mount: the hub only renders after hydration, so the device clock is
  // available here and the streak cannot differ between server and client markup.
  const [today] = useState(() => getLocalPlayedOn(new Date()));
  const { hydrated: adultHydrated, account } = useAdultAccount();
  const childCount = getChildrenOf(account, savedProfiles).length;
  // Read once on mount: the card set belongs to this device and nothing else writes it.
  const [classSet] = useState(() => readClassSet());

  // Nothing is rendered until the stored progress is known, so a returning player never
  // sees the sign-up screen flash before their own home.
  if (!hydrated || !adultHydrated || creatingProfile) {
    return <div className={`${styles.splash} app-chrome-hidden`} />;
  }

  /*
   * A grown-up gets one home, and it stays the same one.
   *
   * Whether or not they have played, this is what they see: their tools, and the map in
   * the bar like everybody else. It used to swap for a second, plainer home the moment
   * they started a game, so the screen they knew turned into a different screen for
   * having used it - and it swapped for the child's hub, offering them a streak, a rank
   * and an adult's permission, all addressed to them about themselves.
   *
   * A child playing on this device still gets the child's hub below: the question is who
   * is holding the phone, not who signed in on it.
   */
  const grownUpAtHome = account !== null && (!onboarded || progressState.adultEmail !== null);

  /*
   * A child with a completed local profile gets their own home instead of onboarding again.
   * While the introduction is still on screen the hub must not take over: signing up
   * flips `onboarded` immediately, and the hub would flash before the route changes.
   */
  if (!grownUpAtHome && onboarded && !needsLocalNicknameCompletion(progressState) && step !== "intro") {
    const overall = getGlobalProgress(progressState);
    const nextMission = getNextMission(progressState);
    const activeIsland = getAvailableIsland(progressState);
    const streak = today ? getStreakToday(progressState.streak, today) : progressState.streak;
    const rank = getPlayerRank(progressState);
    const hubApprenticeAvatarId = savedApprenticeAvatarId ?? defaultApprenticeAvatarId;
    const HubApprenticeIcon = apprenticeAvatarIcons[hubApprenticeAvatarId];

    return (
      <div className={styles.landing}>
        <section aria-labelledby="hub-title" className={styles.hub}>
          {/* Roqui greets the child the same way he greets the teacher: standing beside
              a speech bubble. It is the guide talking, not a header. */}
          {/* The greeting and, above all, where to go next: the one instruction on this
              screen that decides whether a child knows what to do. */}
          <Narrator
            lines={[
              savedLocalNickname ? t("hubGreetingNamed", { name: savedLocalNickname }) : t("hubGreeting"),
              nextMission
                ? t("hubNextHint", { category: tIslands(`categories.${nextMission.category}.title`) })
                : t("hubAllDone")
            ]}
          />
          <div className={styles.mascotRow}>
            <div className={styles.bubble}>
              <h1 className={styles.line} id="hub-title">
                {savedLocalNickname ? t("hubGreetingNamed", { name: savedLocalNickname }) : t("hubGreeting")}
              </h1>
              <p className={styles.hubWelcome}>
                {nextMission
                  ? t("hubNextHint", { category: tIslands(`categories.${nextMission.category}.title`) })
                  : t("hubAllDone")}
              </p>
              <div className={styles.hubContinue}>
                {nextMission ? (
                  <Link className={styles.primaryAction} href={`/level/${nextMission.id}`}>
                    <Play aria-hidden="true" size={17} fill="currentColor" />
                    {t("hubContinue")}
                  </Link>
                ) : (
                  <Link className={styles.primaryAction} href="/worlds">
                    {t("hubMap")}
                  </Link>
                )}
              </div>
            </div>
            <MascotSlot alt={t("mascotAlt")} className={styles.mascot} mood="welcoming" priority />
          </div>

          <div className={styles.progress}>
            <div className={styles.progressHeading}>
              <span className={styles.progressLabel}>{t("progressLabel")}</span>
              <Link
                aria-label={`${tRank("titleNow")}: ${tRank(`titles.${rank.titleKey}`)}`}
                className={`${styles.identity} ${styles.identityLink}`}
                href="/ranks#titles"
              >
                <span
                  aria-label={t("profileAvatarAria", {
                    name: apprenticeNames[apprenticeAvatarIds.indexOf(hubApprenticeAvatarId)]
                  })}
                  className={styles.identityAvatar}
                  role="img"
                >
                  <HubApprenticeIcon aria-hidden="true" strokeWidth={2} />
                </span>
                <span className={styles.identityText}>
                  <span className={styles.identityLabel}>{tRank("titleNow")}</span>
                  <span className={styles.identityTitle}>{tRank(`titles.${rank.titleKey}`)}</span>
                </span>
                {guardian && (
                  <span aria-label={tGuardian("badge")} className={styles.identityCheck} role="img">
                    <Check aria-hidden="true" size={13} strokeWidth={3.5} />
                  </span>
                )}
              </Link>
            </div>
            <div className={styles.progressOverview}>
              {activeIsland && <span className={styles.progressIsland}>{tIslands(`list.${activeIsland}.title`)}</span>}
              <span className={styles.progressPercent}>{t("progressPercent", { percent: overall.percent })}</span>
            </div>
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
            <span className={styles.progressValue}>{t("progressValue", { done: overall.done, total: overall.total })}</span>
          </div>

          <ul className={styles.hubStats}>
            {/* Worked out from the stars already on the map, so it can never claim more
                than the player earned, and it is never a position against other children. */}
            <li>
              <Link
                aria-label={tRank("seeLadder")}
                className={`${styles.hubStat} ${styles.hubStatCardLink} ${rank.tier ? styles.hubStatLive : ""}`}
                href="/ranks"
              >
                <span className={`${styles.hubStatIcon} ${styles.hubStatRank}`}>
                  <Medal aria-hidden="true" size={20} />
                </span>
                <span className={styles.hubStatLabel}>{t("hubRank")}</span>
                <span className={styles.hubStatValue}>
                  {rank.tier ? tRank(`tiers.${rank.tier}`) : tRank("none")}
                </span>
              </Link>
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
            </li>
            {/* Friends used to be a dead tile promising a future. It leads somewhere now. */}
            <li className={styles.hubStat}>
              <Link className={styles.hubStatLink} href="/friends">
                <span className={`${styles.hubStatIcon} ${styles.hubStatFriends}`}>
                  <Users aria-hidden="true" size={20} />
                </span>
                <span className={styles.hubStatLabel}>{t("hubFriends")}</span>
                <span className={styles.hubStatValue}>{tFriends("friendCount", { count: friendCount })}</span>
              </Link>
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
          <Narrator lines={[t("profileCompletionTitle"), t("profileNicknameLabel"), t("profileNicknameHint")]} />
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
        {/*
         * Roqui introducing himself is the first text of the whole game, and a child who
         * cannot read it yet has nothing else to go on. It renders nothing, so it can sit
         * inside the tap target the whole screen is.
         */}
        <Narrator lines={[lines[lineIndex]]} />
      </button>
    );
  }

  /*
   * A device where a grown-up signed in opens on that grown-up's own home.
   *
   * Asking them to invent a nickname and pick an apprentice before they can reach
   * anything would be answering a question they never asked - and asking it twice, since
   * they already said who they are with their address. Choosing to play makes their
   * separate profile, so the game is one tap away rather than behind a form.
   *
   * Only a teacher used to get this. A parent, invisible to the screen, fell through to
   * the child sign-up form: signed in, and yet with no home, no islands and no options.
   */
  if (grownUpAtHome && account.role === "family") {
    return (
      <div className={styles.landing}>
        <section aria-labelledby="family-home-title" className={styles.hub}>
          <div className={styles.mascotRow}>
            <div className={styles.bubble}>
              <h1 className={styles.line} id="family-home-title">
                {tAdult("greeting")}
              </h1>
              <p className={styles.teacherWelcome}>{tAdult("homeWelcome")}</p>
            </div>
            <MascotSlot alt={t("mascotAlt")} className={styles.mascot} mood="welcoming" priority />
          </div>

          {/* What they came for: how the children they look after are doing. */}
          <div className={styles.hubNext}>
            <p className={styles.hubNextLabel}>{tAdult("homeChildrenLabel")}</p>
            <p className={styles.hubNextTitle}>{tAdult("lead", { count: childCount })}</p>
            <Link className={styles.primaryAction} href="/adult">
              <Users aria-hidden="true" size={17} />
              {tAdult("seeChildren")}
            </Link>
          </div>

          <ul className={styles.hubStats}>
            {/*
              The same door the teacher gets: a grown-up who wants to see what their child
              is doing should be able to play it, not only read about it. It is the explicit
              choice that opens their separate profile before the map.
            */}
            <li className={styles.hubStat}>
              <span className={`${styles.hubStatIcon} ${styles.hubStatStreak}`}>
                <Play aria-hidden="true" size={20} fill="currentColor" />
              </span>
              <span className={styles.hubStatLabel}>{tTeacherAccount("homeTryLabel")}</span>
              <AdultPlayLink className={styles.hubStatLink}>
                {t("hubMap")}
              </AdultPlayLink>
            </li>
          </ul>

          <p className={styles.guestNotice}>{tAdult("keepsChildProgress")}</p>
        </section>
      </div>
    );
  }

  if (grownUpAtHome && account.role === "teacher") {
    return (
      <div className={styles.landing}>
        <section aria-labelledby="teacher-home-title" className={styles.hub}>
          {/* Roqui greets the teacher the same way he greets a child: standing beside a
              speech bubble. Same guide, a different grown-up. The email is a setting and
              lives in the settings. */}
          <div className={styles.mascotRow}>
            <div className={styles.bubble}>
              <h1 className={styles.line} id="teacher-home-title">
                {tTeacherAccount("homeGreeting")}
              </h1>
              <p className={styles.teacherWelcome}>{tTeacherAccount("homeWelcome")}</p>
            </div>
            <MascotSlot alt={t("mascotAlt")} className={styles.mascot} mood="welcoming" priority />
          </div>

          {/* The class this device is set up for, or the one thing missing to have one. */}
          <div className={styles.hubNext}>
            {classSet ? (
              <>
                <p className={styles.hubNextLabel}>{tTeacherAccount("homeClassLabel")}</p>
                <p className={styles.hubNextTitle}>
                  {classSet.name ?? tTeacherAccount("homeClassUnnamed")}
                </p>
                <p className={styles.teacherStat}>
                  {tTeacherAccount("homeClassSize", { count: classSet.cards.length })}
                </p>
                <Link className={styles.primaryAction} href="/teacher/cards">
                  <QrCode aria-hidden="true" size={17} />
                  {tTeacherAccount("homeOpenCards")}
                </Link>
              </>
            ) : (
              <>
                <p className={styles.hubNextLabel}>{tTeacherAccount("homeNoClassLabel")}</p>
                <p className={styles.hubNextTitle}>{tCards("cardsLink")}</p>
                <p className={styles.teacherStat}>{tCards("cardsLinkHint")}</p>
                <Link className={styles.primaryAction} href="/teacher/cards">
                  <QrCode aria-hidden="true" size={17} />
                  {tCards("generate")}
                </Link>
              </>
            )}
          </div>

          <ul className={styles.hubStats}>
            <li className={styles.hubStat}>
              <span className={`${styles.hubStatIcon} ${styles.hubStatRank}`}>
                <BookOpenCheck aria-hidden="true" size={20} />
              </span>
              <span className={styles.hubStatLabel}>{tTeacherAccount("homeGuide")}</span>
              <Link className={styles.hubStatLink} href="/teacher">
                {tTeacherAccount("homeGuideAction")}
              </Link>
            </li>
            <li className={styles.hubStat}>
              <span className={`${styles.hubStatIcon} ${styles.hubStatStreak}`}>
                <Play aria-hidden="true" size={20} fill="currentColor" />
              </span>
              <span className={styles.hubStatLabel}>{tTeacherAccount("homeTryLabel")}</span>
              {/* This explicit play action opens the teacher's separate profile before
                  taking them to the map. */}
              <AdultPlayLink className={styles.hubStatLink}>
                {t("hubMap")}
              </AdultPlayLink>
            </li>
            <li className={styles.hubStat}>
              <span className={`${styles.hubStatIcon} ${styles.hubStatFriends}`}>
                <Users aria-hidden="true" size={20} />
              </span>
              <span className={styles.hubStatLabel}>{tTeacherAccount("homeOnlineClass")}</span>
              <span className={styles.hubStatSoon}>{t("hubSoon")}</span>
            </li>
          </ul>

          <p className={styles.guestNotice}>{tTeacherAccount("notSent")}</p>
        </section>
      </div>
    );
  }

  return (
    /* The local profile screen is the entry point, so the header and bottom bar stay hidden. */
    <div className={`${styles.landing} app-chrome-hidden`}>
      <div className={styles.accountLanguage}>
        <LanguageSwitcher />
      </div>

      <section aria-labelledby="profile-title" className={styles.profile}>
        {/*
         * The first screen of the whole game, and the one where a child who cannot read
         * would get stuck before playing a single round. If the voice reaches anywhere, it
         * has to reach here.
         */}
        <Narrator
          lines={[
            t("profileTitle"),
            t("profileAvatar"),
            t("profileNicknameLabel"),
            t("profileNicknameHint")
          ]}
        />
        <h1 className={styles.profileTitle} id="profile-title">
          {/* A grown-up filling this in is naming somebody else, and the form has to say
              so: "what is your name" answered on a child's behalf is a different act. */}
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
            if (enableSoundForNewProfile()) enableForNewProfile();
            setCreatingProfile(true);
            markOnboarded(nickname, apprenticeAvatarId);
            router.replace("/worlds");
          }}
        >
          {t("profileSubmit")}
        </button>

        <p className={styles.profileNote}>{t("profileLocalNote")}</p>

        {/*
          The grown-up's door, from the one screen a new device opens on.

          Only somebody with no account ever reaches this form - a grown-up who signed in
          gets their own home instead - so there is one thing to offer here, and it is the
          way in for whichever kind of grown-up is holding the phone.
        */}
        <Link className={styles.teacherLink} href="/adult/join">
          {tAdult("signIn")}
        </Link>
      </section>
    </div>
  );
}
