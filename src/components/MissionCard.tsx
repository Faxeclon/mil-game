import { ArrowRight, LockKeyhole } from "lucide-react";
import { Link } from "@/i18n/navigation";

type MissionCardProps = {
  number: number;
  title: string;
  description: string;
  available: boolean;
  availableLabel: string;
  comingSoonLabel: string;
  actionLabel: string;
};

export function MissionCard({ number, title, description, available, availableLabel, comingSoonLabel, actionLabel }: MissionCardProps) {
  const body = <><span className="mission-number">{number}</span><div><p className={available ? "status status--available" : "status"}>{available ? availableLabel : <><LockKeyhole aria-hidden="true" size={15} /> {comingSoonLabel}</>}</p><h2>{title}</h2><p>{description}</p></div>{available && <ArrowRight aria-hidden="true" className="mission-arrow" />}</>;
  if (available) return <Link href="/tutorial" className="mission-card mission-card--available" aria-label={`${title}: ${actionLabel}`}>{body}</Link>;
  return <article className="mission-card" aria-label={`${title}: ${comingSoonLabel}`}>{body}</article>;
}

