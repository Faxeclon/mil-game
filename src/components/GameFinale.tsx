"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Clapperboard, Layers3, SearchCheck, Share2, Star, type LucideIcon } from "lucide-react";
import type { IslandKey } from "@/features/levels/levelModel";
import type { GameFinale as Finale } from "@/features/results/gameFinale";
import { Link } from "@/i18n/navigation";
import styles from "./GameFinale.module.css";

/*
 * Flat icons rather than the map's own island artwork.
 *
 * That artwork is drawn to sit on the trail: it positions itself, overflows its box on
 * purpose and layers two images to look like land. Dropped into a list it climbs over the
 * name beside it. Here the icon only has to say which island a row is.
 */
const islandIcons: Record<IslandKey, LucideIcon> = {
  training: SearchCheck,
  difference: Layers3,
  videos: Clapperboard,
  decisions: Share2
};

/**
 * The end of the map, once every mission has been played.
 *
 * Deliberately not another mission-complete card. Finishing the last island is the only
 * moment in the game that is about the whole journey rather than about one picture, so it
 * gets the whole screen: the four islands lighting up in the order they were travelled,
 * the stars kept along the way, and Roqui saying the one thing worth saying at the end -
 * that the child no longer needs to be told where to look.
 *
 * Everything moves with CSS alone. No canvas, no animation library and no new artwork on
 * a phone that is already carrying every image of the game in its cache.
 */
export function GameFinale({ finale, onClose }: { finale: Finale; onClose: () => void }) {
  const t = useTranslations("finale");
  const tTutorial = useTranslations("tutorial");
  const tIslands = useTranslations("islands");

  return (
    <section aria-labelledby="finale-title" className={styles.finale}>
      <span aria-hidden="true" className={styles.rays} />

      <div className={styles.stage}>
        <p className={styles.eyebrow}>{t("eyebrow")}</p>
        <h1 className={styles.title} id="finale-title">
          {t("title")}
        </h1>

        <Image
          alt={tTutorial("mascotAlt")}
          className={styles.mascot}
          height={512}
          priority
          src="/media/mascot/roqui-map-left.png"
          width={512}
        />

        {/*
         * The journey, in order, each island arriving a beat after the one before it. The
         * delay is what turns a row of icons into a path that was walked.
         */}
        <ol className={styles.trail}>
          {finale.islands.map((tally, index) => {
            const Icon = islandIcons[tally.islandKey];

            return (
              <li className={styles.stop} key={tally.islandKey} style={{ animationDelay: `${0.25 + index * 0.22}s` }}>
                <span aria-hidden="true" className={styles.stopIcon}>
                  <Icon size={20} strokeWidth={2.3} />
                </span>
                <span className={styles.stopName}>{tIslands(`list.${tally.islandKey}.title`)}</span>
                <span className={styles.stopStars}>
                  <Star aria-hidden="true" size={13} strokeWidth={2.6} />
                  {t("islandStars", { stars: tally.stars, possible: tally.possible })}
                </span>
              </li>
            );
          })}
        </ol>

        <p className={styles.total}>
          <Star aria-hidden="true" className={styles.totalStar} size={26} strokeWidth={2.4} />
          <strong>{t("totalStars", { stars: finale.stars, possible: finale.possible })}</strong>
          <span>{t("totalMissions", { missions: finale.missions })}</span>
        </p>

        <p className={styles.line}>{t("line")}</p>

        <div className={styles.actions}>
          <Link className={styles.primary} href="/worlds" onClick={onClose}>
            {t("toMap")}
          </Link>
          <button className={styles.secondary} type="button" onClick={onClose}>
            {t("seeResult")}
          </button>
        </div>
      </div>
    </section>
  );
}
