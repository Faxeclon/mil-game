import type { ReactNode } from "react";

export type MascotMood =
  | "welcoming"
  | "thinking"
  | "encouraging"
  | "explaining"
  | "celebrating";

type MascotSlotProps = {
  mood: MascotMood;
  message?: string;
  artwork?: ReactNode;
};

/**
 * A future mascot integration point. It intentionally renders nothing until
 * original artwork and an approved child-facing experience are provided.
 */
export function MascotSlot(props: MascotSlotProps) {
  void props;
  return null;
}
