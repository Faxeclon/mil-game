"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Maximize2, Minus, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import styles from "./ImageZoom.module.css";

/**
 * A closer look at the picture.
 *
 * The whole exercise is noticing a detail - six fingers on a hand, letters that spell
 * nothing, an ear that melts into hair - and on the phones this is built for each picture
 * is about a hundred and sixty pixels wide. Asking a child to spot that is asking them to
 * fail at something they can see perfectly well when it is bigger.
 *
 * Browsers already pinch to zoom, and that is not enough: a child does not discover the
 * gesture, and inside a game it fights the scroll. So it gets a button.
 *
 * The button is deliberately a sibling of the choice card rather than a child of it. The
 * card is a button, one button cannot live inside another, and looking closer must never
 * be mistaken for choosing.
 */
export function ImageZoom({ src, alt }: { src: string; alt: string }) {
  const t = useTranslations("zoom");
  const [open, setOpen] = useState(false);
  const [magnified, setMagnified] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setMagnified(false);
  }, []);

  // Escape closes it, and the page underneath must not scroll away while it is open.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  return (
    <>
      <button
        aria-label={t("open")}
        className={styles.trigger}
        type="button"
        onClick={() => setOpen(true)}
      >
        <Maximize2 aria-hidden="true" size={15} strokeWidth={2.5} />
      </button>

      {open && (
        <div
          aria-label={t("title")}
          aria-modal="true"
          className={styles.overlay}
          role="dialog"
          onClick={close}
        >
          {/* The picture is the point, so a tap on it must not close the thing showing it. */}
          <div
            className={magnified ? styles.stageMagnified : styles.stage}
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              alt={alt}
              className={styles.picture}
              height={1600}
              sizes="100vw"
              src={src}
              width={1200}
            />
          </div>

          <div className={styles.controls} onClick={(event) => event.stopPropagation()}>
            <button
              aria-label={magnified ? t("out") : t("in")}
              className={styles.control}
              type="button"
              onClick={() => setMagnified((was) => !was)}
            >
              {magnified ? <Minus aria-hidden="true" size={18} /> : <Plus aria-hidden="true" size={18} />}
              {magnified ? t("out") : t("in")}
            </button>

            <button aria-label={t("close")} className={styles.control} ref={closeRef} type="button" onClick={close}>
              <X aria-hidden="true" size={18} />
              {t("close")}
            </button>
          </div>

          <p className={styles.hint}>{magnified ? t("panHint") : t("hint")}</p>
        </div>
      )}
    </>
  );
}
