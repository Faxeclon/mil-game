import { AudioLines, CheckCircle2, Clapperboard, FileSearch, Layers3, LockKeyhole, SearchCheck, Send, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";

export type MissionState = "available" | "locked" | "completed";
export type MissionKind = "training" | "source" | "context" | "voices" | "videos" | "share";

type MissionNodeProps = {
  number: number;
  kind: MissionKind;
  state: MissionState;
  title: string;
  description: string;
  availableLabel: string;
  comingSoonLabel: string;
  actionLabel: string;
  side: "left" | "right";
};

const missionIcons: Record<MissionKind, LucideIcon> = {
  training: SearchCheck,
  source: FileSearch,
  context: Layers3,
  voices: AudioLines,
  videos: Clapperboard,
  share: Send
};

export function MissionNode({ number, kind, state, title, description, availableLabel, comingSoonLabel, actionLabel, side }: MissionNodeProps) {
  const Icon = missionIcons[kind];
  const isAvailable = state === "available";
  const isCompleted = state === "completed";
  const status = isAvailable ? availableLabel : comingSoonLabel;
  const icon = isCompleted ? CheckCircle2 : isAvailable ? Icon : LockKeyhole;
  const StatusIcon = icon;
  const body = <><span className="mission-node__index">{number}</span><span className="mission-node__icon"><Icon aria-hidden="true" size={28} strokeWidth={2.2} /></span><div className="mission-node__content"><p className={`mission-node__status mission-node__status--${state}`}><StatusIcon aria-hidden="true" size={15} />{status}</p><h2>{title}</h2><p>{description}</p>{isAvailable && <span className="mission-node__action">{actionLabel}</span>}</div></>;

  if (isAvailable) return <Link className={`mission-node mission-node--${side} mission-node--${state}`} href="/tutorial" aria-label={`${title}: ${actionLabel}`}>{body}</Link>;
  return <article className={`mission-node mission-node--${side} mission-node--${state}`} aria-label={`${title}: ${status}`}>{body}</article>;
}

