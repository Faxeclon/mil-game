"use client";

import Image from "next/image";
import type { TutorialMediaKind } from "@/content/schemas/tutorial";
import styles from "./RoundMedia.module.css";

type RoundMediaProps = {
  src: string;
  alt: string;
  kind?: TutorialMediaKind;
  /** Passed straight to `next/image`; ignored for video, which fills its own box. */
  sizes: string;
  priority?: boolean;
};

/**
 * The thing being judged, whether it is a picture or a clip.
 *
 * A round asks the same question of both, so the choice of element belongs here rather
 * than in every screen that shows one. Packs written before video existed leave `kind`
 * out and keep rendering exactly as they did.
 *
 * The video plays by itself, silently, on a loop, with no controls. Not for polish: a
 * clip that has to be started is a clip a child compares against a picture that was
 * already there, and asking them to press play before they can even look is a barrier in
 * front of the actual task. Silent because two of these sit side by side.
 */
export function RoundMedia({ src, alt, kind = "image", sizes, priority = false }: RoundMediaProps) {
  if (kind === "video") {
    return (
      <video
        aria-label={alt}
        autoPlay
        className={styles.video}
        loop
        muted
        playsInline
        preload="metadata"
        /* Poster-less on purpose: the first frame appears as soon as metadata arrives. */
        src={src}
      />
    );
  }

  return <Image alt={alt} fill priority={priority} sizes={sizes} src={src} />;
}
