import {
  AudioLines,
  Clapperboard,
  FileSearch,
  Layers3,
  LockKeyhole,
  Play,
  SearchCheck,
  Send,
  type LucideIcon
} from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getMissionActionHref, type MissionBlueprint, type MissionKind } from "@/features/missions/missionMap";
import styles from "./MissionMap.module.css";

type LocalizedMission = MissionBlueprint & {
  title: string;
  ariaLabel: string;
};

type MissionMapProps = {
  missions: LocalizedMission[];
  labels: {
    mapAria: string;
    greeting: string;
    available: string;
    comingSoon: string;
    completed: string;
    play: string;
    tip: string;
    mascotAlt: string;
  };
};

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

const mobileRouteSegments = [
  "M 22 9 C 38 10, 76 15, 78 25",
  "M 78 25 C 81 35, 26 34, 22 42",
  "M 22 42 C 18 52, 75 51, 78 59",
  "M 78 59 C 82 68, 26 68, 22 76",
  "M 22 76 C 18 85, 67 87, 78 94"
];

const desktopRouteSegments = [
  "M 21 9 C 37 10, 75 15, 79 25",
  "M 79 25 C 83 35, 25 34, 21 42",
  "M 21 42 C 17 52, 75 51, 79 59",
  "M 79 59 C 83 68, 25 68, 21 76",
  "M 21 76 C 17 85, 68 87, 79 94"
];

/**
 * A trail of floating worlds a child walks from top to bottom. Each world is one large
 * round target that either opens straight away or is visibly still closed: no menus and
 * no intermediate step between wanting to play and playing.
 */
export function MissionMap({ missions, labels }: MissionMapProps) {
  return (
    <div className={styles.map}>
      <p className={styles.greeting}>{labels.greeting}</p>

      <div className={styles.journey}>
        <MissionTrail missions={missions} />
        <ol aria-label={labels.mapAria} className={styles.path}>
          {missions.map((mission, index) => {
            const Icon = missionIcons[mission.kind];
            const isAvailable = mission.state === "available";
            const isCompleted = mission.state === "completed";
            const href = getMissionActionHref(mission);
            const stateClass = isAvailable ? styles.available : isCompleted ? styles.completed : styles.locked;
            const nodeSide = getNodeSide(index);

            const world = (
              <>
                <span className={styles.orb}>
                  <Icon aria-hidden="true" size={isAvailable ? 44 : 32} strokeWidth={2.1} />
                  <span className={styles.orbNumber}>{index + 1}</span>
                  {!isAvailable && !isCompleted && (
                    <span className={styles.lock}>
                      <LockKeyhole aria-hidden="true" size={15} />
                    </span>
                  )}
                  {isAvailable && (
                    <span className={styles.playBadge}>
                      <Play aria-hidden="true" size={13} fill="currentColor" />
                      {labels.play}
                    </span>
                  )}
                </span>
                <span className={styles.caption}>
                  <span className={styles.title}>{mission.title}</span>
                  <span className={styles.state}>
                    {isAvailable ? labels.available : isCompleted ? labels.completed : labels.comingSoon}
                  </span>
                </span>
              </>
            );

            return (
              <li className={`${styles.step} ${stateClass}`} key={mission.key}>
                <MissionMarker kind={mission.kind} />
                <div className={styles.nodeStage}>
                  {href ? (
                    <Link aria-label={mission.ariaLabel} className={styles.world} href={href}>
                      {world}
                    </Link>
                  ) : (
                    <span aria-label={mission.ariaLabel} className={styles.world} role="img">
                      {world}
                    </span>
                  )}
                  {isAvailable && <MissionGuide alt={labels.mascotAlt} nodeSide={nodeSide} tip={labels.tip} />}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function MissionTrail({ missions }: Pick<MissionMapProps, "missions">) {
  const isSegmentCompleted = (index: number) => missions[index]?.state === "completed";

  return (
    <svg aria-hidden="true" className={styles.trail} preserveAspectRatio="none" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="completed-route" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ff9a47" />
          <stop offset="0.48" stopColor="#f47719" />
          <stop offset="1" stopColor="#df5a0c" />
        </linearGradient>
      </defs>
      {mobileRouteSegments.map((segment, index) => (
        <path
          className={`${styles.mobileTrail} ${styles.routeSegment} ${isSegmentCompleted(index) ? styles.completedRouteSegment : ""}`}
          d={segment}
          key={`mobile-${index}`}
          pathLength="1"
        />
      ))}
      {desktopRouteSegments.map((segment, index) => (
        <path
          className={`${styles.desktopTrail} ${styles.routeSegment} ${isSegmentCompleted(index) ? styles.completedRouteSegment : ""}`}
          d={segment}
          key={`desktop-${index}`}
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
