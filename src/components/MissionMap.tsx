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
import { MascotSlot } from "@/features/mascot/MascotSlot";
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

/**
 * A trail of floating worlds a child walks from top to bottom. Each world is one large
 * round target that either opens straight away or is visibly still closed: no menus and
 * no intermediate step between wanting to play and playing.
 */
export function MissionMap({ missions, labels }: MissionMapProps) {
  return (
    <div className={styles.map}>
      <p className={styles.greeting}>{labels.greeting}</p>

      <ol aria-label={labels.mapAria} className={styles.path}>
        {missions.map((mission, index) => {
          const Icon = missionIcons[mission.kind];
          const isAvailable = mission.state === "available";
          const isCompleted = mission.state === "completed";
          const href = getMissionActionHref(mission);
          const stateClass = isAvailable ? styles.available : isCompleted ? styles.completed : styles.locked;

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
              {href ? (
                <Link aria-label={mission.ariaLabel} className={styles.world} href={href}>
                  {world}
                </Link>
              ) : (
                <span aria-label={mission.ariaLabel} className={styles.world} role="img">
                  {world}
                </span>
              )}
              {isAvailable && (
                <span className={styles.guide}>
                  <span className={styles.guideTip}>{labels.tip}</span>
                  <MascotSlot alt={labels.mascotAlt} className={styles.guideMascot} mood="explaining" priority />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
