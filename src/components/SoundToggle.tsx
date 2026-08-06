"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useHasMounted } from "@/features/app/useHasMounted";
import { toggleSound, useSoundEnabled } from "@/features/audio/soundPreference";
import styles from "./SoundToggle.module.css";

/**
 * Turns the game's own sound on and off, next to the language switch.
 *
 * It sits in the header rather than buried in a settings screen because the moment
 * somebody wants it is the moment the room goes quiet: a classroom starting, a baby
 * asleep, a bus. Having to go looking for it is having to put up with the noise.
 *
 * The choice is kept even before there is anything to hear, so the game never makes a
 * sound the device already said no to.
 */
export function SoundToggle() {
  const t = useTranslations("sound");
  const hasMounted = useHasMounted();
  const enabled = useSoundEnabled();

  // Until mounted the stored answer is unknown, and guessing would flip the icon on load.
  const isOn = hasMounted ? enabled : true;

  return (
    <button
      aria-label={isOn ? t("turnOff") : t("turnOn")}
      aria-pressed={isOn}
      className={`${styles.toggle} ${isOn ? styles.on : styles.off}`}
      title={isOn ? t("on") : t("off")}
      type="button"
      onClick={toggleSound}
    >
      {isOn ? <Volume2 aria-hidden="true" size={18} /> : <VolumeX aria-hidden="true" size={18} />}
    </button>
  );
}
