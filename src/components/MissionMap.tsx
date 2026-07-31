"use client";

import { useState } from "react";
import { AudioLines, Check, CheckCircle2, Clapperboard, FileSearch, Layers3, LockKeyhole, Play, SearchCheck, Send, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getDefaultMissionKey, getMissionActionHref, type MissionBlueprint, type MissionKey, type MissionKind } from "@/features/missions/missionMap";
import styles from "./MissionMap.module.css";

type LocalizedMission = MissionBlueprint & {
  title: string;
  description: string;
  ariaLabel: string;
};

type MissionMapProps = {
  missions: LocalizedMission[];
  labels: {
    mapAria: string;
    detailsTitle: string;
    available: string;
    comingSoon: string;
    completed: string;
    trainingMeta: string;
    startTraining: string;
    startShort: string;
    expandDetails: string;
    collapseDetails: string;
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

export function MissionMap({ missions, labels }: MissionMapProps) {
  const [selectedKey, setSelectedKey] = useState<MissionKey>(() => getDefaultMissionKey(missions));
  const [isDrawerExpanded, setDrawerExpanded] = useState(false);
  const selectedMission = missions.find((mission) => mission.key === selectedKey) ?? missions[0];
  const actionHref = getMissionActionHref(selectedMission);
  const SelectedIcon = missionIcons[selectedMission.kind];
  const selectedStatus = selectedMission.state === "available" ? labels.available : selectedMission.state === "completed" ? labels.completed : labels.comingSoon;

  return (
    <div className={styles.layout}>
      <section aria-label={labels.mapAria} className={styles.map}>
        <div className={styles.canvas}>
          <MapTrail />
          <span aria-hidden="true" className={`${styles.zone} ${styles.zoneOne}`} />
          <span aria-hidden="true" className={`${styles.zone} ${styles.zoneTwo}`} />
          <span aria-hidden="true" className={`${styles.zone} ${styles.zoneThree}`} />
          <span aria-hidden="true" className={`${styles.clue} ${styles.clueOne}`} />
          <span aria-hidden="true" className={`${styles.clue} ${styles.clueTwo}`} />
          <ol className={styles.nodes}>
            {missions.map((mission, index) => {
              const Icon = missionIcons[mission.kind];
              const isSelected = mission.key === selectedMission.key;
              const isAvailable = mission.state === "available";
              const isCompleted = mission.state === "completed";
              return (
                <li className={`${styles.nodePosition} ${styles[`node${index + 1}`]}`} key={mission.key}>
                  <button
                    aria-controls="mission-details"
                    aria-label={mission.ariaLabel}
                    aria-pressed={isSelected}
                    className={`${styles.node} ${isAvailable ? styles.available : styles.locked} ${isCompleted ? styles.completed : ""} ${isSelected ? styles.selected : ""}`}
                    type="button"
                    onClick={() => {
                      setSelectedKey(mission.key);
                      setDrawerExpanded(false);
                    }}
                  >
                    <span className={styles.nodeNumber}>{index + 1}</span>
                    <span className={styles.nodeIcon}><Icon aria-hidden="true" size={isAvailable ? 28 : 23} strokeWidth={2.25} /></span>
                    <span className={styles.nodeTitle}>{mission.title}</span>
                    {isAvailable && <span className={styles.playAffordance}><Play aria-hidden="true" size={14} fill="currentColor" />{labels.startShort}</span>}
                    {!isAvailable && <span className={styles.lockAffordance}><LockKeyhole aria-hidden="true" size={14} /></span>}
                    {isSelected && <span className={styles.selectedMarker}><Check aria-hidden="true" size={15} /></span>}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <aside className={`${styles.details} ${isDrawerExpanded ? styles.drawerExpanded : styles.drawerCollapsed}`} id="mission-details" aria-labelledby="mission-details-title">
        <div className={styles.detailsHeader}>
          <div>
            <p className={styles.detailsEyebrow}>{labels.detailsTitle}</p>
            <h2 id="mission-details-title">{selectedMission.title}</h2>
          </div>
          <button aria-controls="mission-details-content" aria-expanded={isDrawerExpanded} className={styles.drawerToggle} type="button" onClick={() => setDrawerExpanded((expanded) => !expanded)}>{isDrawerExpanded ? labels.collapseDetails : labels.expandDetails}</button>
        </div>
        <div className={styles.detailsContent} id="mission-details-content">
          <div className={styles.detailsBody}>
            <div className={styles.detailsIcon}><SelectedIcon aria-hidden="true" size={30} /></div>
            <p className={`${styles.status} ${selectedMission.state === "available" ? styles.statusAvailable : ""}`}>{selectedMission.state === "completed" ? <CheckCircle2 aria-hidden="true" size={16} /> : selectedMission.state === "available" ? <Play aria-hidden="true" size={16} fill="currentColor" /> : <LockKeyhole aria-hidden="true" size={16} />}{selectedStatus}</p>
            {selectedMission.state === "available" && <p className={styles.metadata}>{labels.trainingMeta}</p>}
            <p className={styles.description}>{selectedMission.description}</p>
          </div>
          {actionHref && <div className={styles.detailsFooter}><Link className={styles.startAction} href={actionHref}><Play aria-hidden="true" size={18} fill="currentColor" />{labels.startTraining}</Link></div>}
        </div>
      </aside>
    </div>
  );
}

function MapTrail() {
  return (
    <svg aria-hidden="true" className={styles.trail} preserveAspectRatio="none" viewBox="0 0 100 100">
      <path className={styles.desktopTrail} d="M 14 18 C 25 20, 28 12, 42 11 S 58 30, 69 27 S 88 36, 83 48 S 64 58, 52 66 S 38 77, 27 84" pathLength="100" />
      <path className={styles.mobileTrail} d="M 29 13 C 42 17, 56 23, 69 27 S 45 37, 32 43 S 57 53, 69 59 S 42 69, 29 75 S 54 85, 67 90" pathLength="100" />
      <circle cx="14" cy="18" r="1.5" className={styles.trailDot} />
      <circle cx="27" cy="84" r="1.5" className={styles.trailDot} />
    </svg>
  );
}
