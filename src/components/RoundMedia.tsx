"use client";

import Image from "next/image";
import { useState } from "react";
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
  const [readyVideoSrc, setReadyVideoSrc] = useState<string | null>(null);
  const videoReady = readyVideoSrc === src;

  if (kind === "video") {
    return (
      <>
        <video
          aria-busy={!videoReady}
          aria-label={alt}
          autoPlay
          className={`${styles.video} ${videoReady ? styles.videoReady : ""}`}
          loop
          muted
          playsInline
          preload="metadata"
          src={src}
          onLoadedData={() => setReadyVideoSrc(src)}
        />
        {!videoReady && <span aria-hidden="true" className={styles.loading} />}
      </>
    );
  }

  return <Image alt={alt} fill priority={priority} sizes={sizes} src={src} />;
}
