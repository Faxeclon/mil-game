import { MascotSlot } from "@/features/mascot/MascotSlot";
import styles from "./LoadingRoqui.module.css";

/**
 * What a child sees while the game is thinking.
 *
 * A tap that changes nothing on screen reads as a tap that did not work, so it gets tapped
 * again. On the phones this is built for that pause is real and sometimes long, which is
 * why it gets a face rather than a line of grey text: Roqui waiting with you is a moment
 * in the game, not a fault in it.
 *
 * The state is announced as well as drawn. `role="status"` lets a screen reader say it
 * without stealing focus, and the dots stop moving entirely when the phone asks for less
 * movement.
 */
export function LoadingRoqui({
  message,
  title,
  mascotAlt = ""
}: {
  /** What is happening, in the child's language. */
  message: string;
  /** Optional heading, so a whole screen replaced by this one still says where it is. */
  title?: string;
  mascotAlt?: string;
}) {
  return (
    <div className={`${styles.loading} app-chrome-hidden`}>
      {title && <h1 className={styles.title}>{title}</h1>}

      <MascotSlot alt={mascotAlt} className={styles.mascot} mood="thinking" size={140} />

      <p className={styles.message} role="status">
        {message}
        <span aria-hidden="true" className={styles.dots}>
          <span />
          <span />
          <span />
        </span>
      </p>
    </div>
  );
}
