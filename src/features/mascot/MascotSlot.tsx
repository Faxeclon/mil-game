import Image from "next/image";
import styles from "./MascotSlot.module.css";

export type MascotMood =
  | "welcoming"
  | "thinking"
  | "encouraging"
  | "explaining"
  | "celebrating";

/**
 * Artwork per mood. Two mirrored poses exist so the mascot can face the content it
 * accompanies; adding a dedicated pose later only means changing one path here.
 */
const artworkByMood: Record<MascotMood, string> = {
  welcoming: "/media/mascot/roqui-right.png",
  thinking: "/media/mascot/roqui-left.png",
  encouraging: "/media/mascot/roqui-right.png",
  explaining: "/media/mascot/roqui-left.png",
  celebrating: "/media/mascot/roqui-right.png"
};

type MascotSlotProps = {
  mood: MascotMood;
  /** Describes the character for screen readers; pass an empty string when decorative. */
  alt: string;
  size?: number;
  className?: string;
  priority?: boolean;
};

/** Renders the project mascot for a given mood as a rounded avatar. */
export function MascotSlot({ mood, alt, size = 240, className, priority = false }: MascotSlotProps) {
  return (
    <span className={[styles.frame, className].filter(Boolean).join(" ")}>
      <Image
        alt={alt}
        aria-hidden={alt === "" ? true : undefined}
        className={styles.art}
        height={size}
        priority={priority}
        src={artworkByMood[mood]}
        width={size}
      />
    </span>
  );
}
