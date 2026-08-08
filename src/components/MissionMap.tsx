"use client";

import {
  AudioLines,
  Check,
  Clapperboard,
  Cloud,
  FileSearch,
  Hourglass,
  Layers3,
  Leaf,
  LockKeyhole,
  Moon,
  Play,
  SearchCheck,
  Send,
  Smartphone,
  Sparkles,
  Star,
  type LucideIcon
} from "lucide-react";
import Image from "next/image";
import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { islands } from "@/features/levels/levelModel";
import { getIslandState, islandHasContent, type PlayState } from "@/features/levels/levelProgress";
import { getIslandProgress } from "@/features/levels/progressSummary";
import type { MissionKind } from "@/features/missions/missionMap";
import { useProgress } from "@/features/progress/ProgressProvider";
import { OnboardingSpotlight } from "./OnboardingSpotlight";
import styles from "./MissionMap.module.css";

const missionIcons: Record<MissionKind, LucideIcon> = {
  training: SearchCheck,
  source: FileSearch,
  context: Layers3,
  voices: AudioLines,
  videos: Clapperboard,
  share: Send
};

const missionMarkers: Record<MissionKind, readonly string[]> = {
  training: ["/media/map/start.svg"],
  source: ["/media/map/source.svg"],
  context: ["/media/map/context.svg"],
  voices: ["/media/map/voices.svg"],
  videos: ["/media/map/videos.svg"],
  share: ["/media/map/share-shield.svg", "/media/map/share-plane.svg"]
};

type NodeSide = "left" | "right";

const guideAssetByNodeSide: Record<NodeSide, string> = {
  left: "/media/mascot/roqui-map-left.png",
  right: "/media/mascot/roqui-map-right.png"
};

const getNodeSide = (index: number): NodeSide => (index % 2 === 0 ? "left" : "right");

/**
 * Where each island sits on the map, in percentages of the journey box. The nodes and
 * the trail both read from this one list, which is what keeps the path attached to the
 * islands at every screen size: there is no second layout to drift out of step.
 */
function getNodePositions(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    x: index % 2 === 0 ? 27 : 73,
    y: ((index + 0.5) / count) * 100
  }));
}

/** A smooth S curve from one island to the next. */
function buildSegment(from: { x: number; y: number }, to: { x: number; y: number }) {
  const bend = (to.y - from.y) * 0.55;
  return `M ${from.x} ${from.y} C ${from.x} ${from.y + bend}, ${to.x} ${to.y - bend}, ${to.x} ${to.y}`;
}

/**
 * A trail of floating worlds a child walks from top to bottom. Each world is one large
 * round target that either opens straight away or is visibly still closed: no menus and
 * no intermediate step between wanting to play and playing.
 *
 * Every state shown here is derived from stored progress, never from fixed data.
 */
export function MissionMap() {
  const t = useTranslations("worlds");
  const tIslands = useTranslations("islands");
  const tStorage = useTranslations("storage");
  const { progressState, completeMapOnboarding } = useProgress();

  /*
   * Each island on the trail is a zone: a themed group of levels. An island with no
   * playable content is marked apart from one shut by progress, because "not built yet"
   * and "you have not reached it" are different promises to a child.
   */
  const missions = islands.map((zone) => ({
    key: zone.key,
    kind: zone.icon,
    state: getIslandState(progressState, zone.key),
    isUpcoming: !islandHasContent(zone.key),
    progress: getIslandProgress(progressState, zone.key),
    title: tIslands(`list.${zone.key}.title`)
  }));

  const positions = getNodePositions(missions.length);
  const tutorialIsland = islands.find((island) => island.key === "training")?.key;

  const statusLabel = (state: PlayState, isUpcoming: boolean) =>
    state === "available"
      ? t("available")
      : state === "completed"
        ? t("completed")
        : isUpcoming
          ? t("comingSoon")
          : t("lockedIsland");

  return (
    <div className={styles.map}>
      <p className={styles.greeting}>{t("title")}</p>
      {/* Said on the map too, where a child looks at everything they have earned. */}
      <p className={styles.guestNotice}>
        <Smartphone aria-hidden="true" size={13} />
        {tStorage("guestNotice")}
      </p>

      <div className={styles.journey} style={{ "--island-count": missions.length } as CSSProperties}>
        <MapEnvironment />
        <MapSky />
        <MissionTrail
          completedFlags={missions.map((mission) => mission.state === "completed")}
          nextSegmentIndex={missions.findIndex((mission) => mission.state === "available") - 1}
          positions={positions}
        />
        <ol aria-label={t("pathAriaLabel")} className={styles.path}>
          {missions.map((mission, index) => {
            const Icon = missionIcons[mission.kind];
            const isAvailable = mission.state === "available";
            const isCompleted = mission.state === "completed";
            const href = isAvailable || isCompleted ? `/island/${mission.key}` : null;
            const stateClass = isAvailable
              ? styles.available
              : isCompleted
                ? styles.completed
                : mission.isUpcoming
                  ? styles.upcoming
                  : styles.locked;
            const nodeSide = getNodeSide(index);
            const ariaLabel = t("nodeAria", {
              number: index + 1,
              title: mission.title,
              status: statusLabel(mission.state, mission.isUpcoming)
            });

            const world = (
              <>
                <span className={styles.orb}>
                  <Icon aria-hidden="true" size={isAvailable ? 44 : 32} strokeWidth={2.1} />
                  <span className={styles.orbNumber}>{index + 1}</span>
                  {isCompleted && (
                    <span className={styles.doneBadge}>
                      <Check aria-hidden="true" size={15} strokeWidth={3.4} />
                    </span>
                  )}
                  {/* A padlock only where progress is the reason; an hourglass where the
                      island simply does not exist yet. Two shapes, not two colours. */}
                  {!isAvailable && !isCompleted && (
                    <span className={styles.lock}>
                      {mission.isUpcoming ? (
                        <Hourglass aria-hidden="true" size={14} />
                      ) : (
                        <LockKeyhole aria-hidden="true" size={15} />
                      )}
                    </span>
                  )}
                  {isAvailable && (
                    <span className={styles.playBadge}>
                      <Play aria-hidden="true" size={13} fill="currentColor" />
                      {tIslands("available")}
                    </span>
                  )}
                </span>
                <span className={styles.caption}>
                  <span className={styles.title}>{mission.title}</span>
                  <span className={styles.state}>{statusLabel(mission.state, mission.isUpcoming)}</span>
                  {!mission.progress.isEmpty && (
                    <span
                      aria-label={t("islandCountAria", {
                        done: mission.progress.done,
                        total: mission.progress.total
                      })}
                      className={styles.count}
                      role="img"
                    >
                      {t("islandCount", { done: mission.progress.done, total: mission.progress.total })}
                    </span>
                  )}
                </span>
              </>
            );

            return (
              <li
                className={`${styles.step} ${stateClass} ${nodeSide === "left" ? styles.stepLeft : styles.stepRight}`}
                key={mission.key}
                style={
                  { "--node-x": `${positions[index].x}%`, "--node-y": `${positions[index].y}%` } as CSSProperties
                }
              >
                <MissionMarker kind={mission.kind} />
                <div className={styles.nodeStage}>
                  {href ? (
                    <Link
                      aria-label={ariaLabel}
                      className={styles.world}
                      data-onboarding-target={mission.key === tutorialIsland ? "tutorial-island" : undefined}
                      href={href}
                      onClick={() => {
                        if (mission.key === tutorialIsland) completeMapOnboarding();
                      }}
                    >
                      {world}
                    </Link>
                  ) : (
                    <span aria-label={ariaLabel} className={styles.world} role="img">
                      {world}
                    </span>
                  )}
                  {isAvailable && (
                    <MissionGuide alt={t("mascotAlt")} nodeSide={nodeSide} tip={t("mascotTip")} />
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      <OnboardingSpotlight
        active={!progressState.mapOnboardingCompleted}
        instruction={t("journeyHint")}
        targetSelector='[data-onboarding-target="tutorial-island"]'
        title={t("mascotTip")}
      />
    </div>
  );
}

function MapEnvironment() {
  return <div aria-hidden="true" className={styles.environment} />;
}

/** Scattered decoration so the journey reads as a place rather than a flat list. */
const skyIcons = [
  { Icon: Star, className: styles.skyOne, size: 20 },
  { Icon: Sparkles, className: styles.skyTwo, size: 17 },
  { Icon: Cloud, className: styles.skyThree, size: 30 },
  { Icon: Star, className: styles.skyFour, size: 14 },
  { Icon: Leaf, className: styles.skyFive, size: 19 },
  { Icon: Sparkles, className: styles.skySix, size: 22 },
  { Icon: Cloud, className: styles.skySeven, size: 26 },
  { Icon: Star, className: styles.skyEight, size: 17 },
  { Icon: Moon, className: styles.skyNine, size: 18 },
  { Icon: Sparkles, className: styles.skyTen, size: 15 },
  { Icon: Leaf, className: styles.skyEleven, size: 16 },
  { Icon: Star, className: styles.skyTwelve, size: 22 }
] as const;

function MapSky() {
  return (
    <div aria-hidden="true" className={styles.sky}>
      {skyIcons.map(({ Icon, className, size }, index) => (
        <span className={`${styles.skyIcon} ${className}`} key={index}>
          <Icon size={size} strokeWidth={2.1} />
        </span>
      ))}
    </div>
  );
}

/**
 * Segment `i` links island `i` to island `i + 1`, so it lights up once `i` is done.
 * The segment that leads into the open island runs as moving dashes, pointing a child
 * towards where to go next without any words.
 */
function MissionTrail({
  positions,
  completedFlags,
  nextSegmentIndex
}: {
  positions: { x: number; y: number }[];
  completedFlags: boolean[];
  nextSegmentIndex: number;
}) {
  return (
    <svg aria-hidden="true" className={styles.trail} preserveAspectRatio="none" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="completed-route" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ff9a47" />
          <stop offset="0.48" stopColor="#f47719" />
          <stop offset="1" stopColor="#df5a0c" />
        </linearGradient>
      </defs>
      {positions.slice(0, -1).map((from, index) => (
        <path
          className={[
            styles.routeSegment,
            completedFlags[index] === true ? styles.completedRouteSegment : "",
            index === nextSegmentIndex ? styles.nextRouteSegment : ""
          ]
            .filter(Boolean)
            .join(" ")}
          d={buildSegment(from, positions[index + 1])}
          key={index}
          pathLength="1"
        />
      ))}
    </svg>
  );
}

function MissionMarker({ kind }: { kind: MissionKind }) {
  const [primaryAsset, secondaryAsset] = missionMarkers[kind];

  return (
    <span
      aria-hidden="true"
      className={`${styles.marker} ${styles[`marker${kind[0].toUpperCase()}${kind.slice(1)}`]}`}
    >
      <Image alt="" className={styles.markerPrimary} height={256} src={primaryAsset} unoptimized width={256} />
      {secondaryAsset && (
        <Image alt="" className={styles.markerSecondary} height={256} src={secondaryAsset} unoptimized width={256} />
      )}
    </span>
  );
}

function MissionGuide({ alt, nodeSide, tip }: { alt: string; nodeSide: NodeSide; tip: string }) {
  return (
    <span
      className={`${styles.guide} ${nodeSide === "left" ? styles.guideAtLeftNode : styles.guideAtRightNode}`}
    >
      <span className={styles.guideTip}>{tip}</span>
      <Image
        alt={alt}
        className={styles.guideMascot}
        height={512}
        priority
        src={guideAssetByNodeSide[nodeSide]}
        width={512}
      />
    </span>
  );
}
