"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, Clock, Flame, Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { getChildrenOf, summariseChildren, getUnlinkedChildren } from "@/features/adults/childrenOfAdult";
import { useAdultAccount } from "@/features/adults/adultAccountStore";
import { seedSampleChildren } from "@/features/adults/sampleChildren";
import { MascotSlot } from "@/features/mascot/MascotSlot";
import { useProgress } from "@/features/progress/ProgressProvider";
import { getLocalPlayedOn } from "@/features/progress/streak";
import { Link } from "@/i18n/navigation";
import { LoadingRoqui } from "./LoadingRoqui";
import { AdultPlayLink } from "./AdultPlayLink";
import styles from "./AdultClient.module.css";

/**
 * What a parent sees: the children they look after, and how each one is doing.
 *
 * The list is derived from the children's own profiles - each one records the adult who
 * authorised it - rather than kept as a second copy here. One fact, read from one place,
 * so the two can never disagree about who looks after whom.
 *
 * There are no real names anywhere. A child is a nickname, their medals and their streak,
 * which is everything this game knows about them and everything a parent needs to see.
 */
export function AdultClient() {
  const t = useTranslations("adult");
  const tCards = useTranslations("cards");
  const tRank = useTranslations("rank");
  const tHome = useTranslations("home");
  const tLocked = useTranslations("locked");

  const { hydrated: accountHydrated, account } = useAdultAccount();
  const { hydrated, savedProfiles, removeProfile } = useProgress();
  const [today] = useState(() => getLocalPlayedOn(new Date()));
  const [confirmingRemoval, setConfirmingRemoval] = useState<string | null>(null);

  /*
   * While developing, a grown-up with nobody linked gets three ready-made children, so
   * this screen can be looked at with something in it. It does nothing once built.
   */
  useEffect(() => {
    if (!accountHydrated || !hydrated || !account) return;
    if (getChildrenOf(account, savedProfiles).length > 0) return;
    seedSampleChildren(account.email, new Date());
  }, [accountHydrated, hydrated, account, savedProfiles]);

  if (!accountHydrated || !hydrated) {
    return <LoadingRoqui message={tLocked("checking")} title={t("title")} />;
  }

  if (!account) {
    return (
      <div className={styles.adult}>
        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.lead}>{t("needsAccount")}</p>
        <Link className={styles.primary} href="/adult/join">
          {t("signIn")}
        </Link>
      </div>
    );
  }

  const mine = getChildrenOf(account, savedProfiles);
  const unclaimed = getUnlinkedChildren(savedProfiles);
  const children = summariseChildren(mine, today);
  const removing = confirmingRemoval
    ? children.find((child) => child.id === confirmingRemoval) ?? null
    : null;

  return (
    <div className={styles.adult}>
      <Link className={styles.back} href="/">
        <ChevronLeft aria-hidden="true" size={18} />
        {tCards("back")}
      </Link>

      <div className={styles.mascotRow}>
        <div className={styles.bubble}>
          <h1 className={styles.title}>{t("greeting")}</h1>
          <p className={styles.lead}>{t("lead", { count: children.length })}</p>
        </div>
        <MascotSlot alt={tHome("mascotAlt")} className={styles.mascot} mood="welcoming" priority />
      </div>

      {children.length === 0 ? (
        <p className={styles.empty}>{t("noChildren")}</p>
      ) : (
        <ul className={styles.list}>
          {children.map((child) => (
            <li className={styles.card} key={child.id}>
              <div className={styles.cardHead}>
                <span className={styles.alias}>{child.nickname}</span>
                <span className={styles.rankTitle}>{tRank(`titles.${child.rankTitleKey}`)}</span>
              </div>

              {/* The bar and the numbers say the same thing: colour alone never carries it. */}
              <p
                aria-valuemax={child.total}
                aria-valuemin={0}
                aria-valuenow={child.done}
                aria-label={t("progressAria", { name: child.nickname, done: child.done, total: child.total })}
                className={styles.track}
                role="progressbar"
              >
                <span className={styles.fill} style={{ width: `${child.percent}%` }} />
              </p>

              <p className={styles.stats}>
                <span>{t("missions", { done: child.done, total: child.total })}</span>
                <span className={styles.stat}>
                  <Star aria-hidden="true" size={14} />
                  {child.stars}
                </span>
                <span className={styles.stat}>
                  <Flame aria-hidden="true" size={14} />
                  {tHome("streakDays", { days: child.streakDays })}
                </span>
              </p>

              {/*
                How long, and how recently. The two questions a grown-up actually opens
                this screen with, and the two the game can answer from what it already
                records - so neither of them is an estimate.
              */}
              <p className={styles.stats}>
                <span className={styles.stat}>
                  <Clock aria-hidden="true" size={14} />
                  {/* Hours once there are hours: "214 minutes" makes a parent do the
                      division before they can tell whether it is a lot. */}
                  {child.playedMinutes >= 60
                    ? t("timePlayedHours", {
                        hours: Math.floor(child.playedMinutes / 60),
                        minutes: child.playedMinutes % 60
                      })
                    : t("timePlayed", { minutes: child.playedMinutes })}
                </span>
                <span className={styles.stat}>
                  <CalendarDays aria-hidden="true" size={14} />
                  {child.daysSincePlayed === null
                    ? t("lastPlayedNever")
                    : t("lastPlayed", { days: child.daysSincePlayed })}
                </span>
              </p>

              <div className={styles.cardActions}>
                {/*
                  Watching, not playing. Picking up a child's game from here would put an
                  adult's answers into the child's own record, and the record is the whole
                  point of this screen: it has to be theirs to be worth reading.
                */}
                <button
                  aria-label={t("removeNamed", { name: child.nickname })}
                  className={styles.remove}
                  type="button"
                  onClick={() => setConfirmingRemoval(child.id)}
                >
                  <Trash2 aria-hidden="true" size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* A child already playing on this phone that nobody has claimed yet. */}
      {unclaimed.length > 0 && <p className={styles.unclaimed}>{t("unclaimed", { count: unclaimed.length })}</p>}

      {/*
        No way to make a child from here, on purpose.

        A child starts their own game as a guest and links the grown-up who looks after
        them from their own settings, which is the only order that has the consent coming
        from the adult about a child who already exists. Offering it here as well would be
        a second road to the same place, and the one that skips the child.
      */}
      <p className={styles.privacy}>{t("privacy")}</p>

      <section aria-label={t("homePlayLabel")}>
        <AdultPlayLink className={styles.primary}>{t("homePlayAction")}</AdultPlayLink>
      </section>

      {/* Erasing a child's medals is the one thing here that cannot be undone. */}
      {removing && (
        <div
          aria-label={t("removeConfirm", { name: removing.nickname })}
          aria-modal="true"
          className={styles.confirmOverlay}
          role="dialog"
          onClick={() => setConfirmingRemoval(null)}
        >
          <div className={styles.confirmSheet} onClick={(event) => event.stopPropagation()}>
            <p className={styles.confirmQuestion}>{t("removeConfirm", { name: removing.nickname })}</p>
            <p className={styles.confirmDetail}>{t("removeDetail")}</p>
            <div className={styles.confirmActions}>
              <button
                className={styles.confirmYes}
                type="button"
                onClick={() => {
                  removeProfile(removing.id);
                  setConfirmingRemoval(null);
                }}
              >
                {t("removeYes")}
              </button>
              <button className={styles.confirmNo} type="button" onClick={() => setConfirmingRemoval(null)}>
                {tCards("back")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
