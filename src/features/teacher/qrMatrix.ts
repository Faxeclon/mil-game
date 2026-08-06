import QRCode from "qrcode";

/**
 * The QR of a card, as something that can be drawn straight into the page.
 *
 * The encoder is asked for the raw module grid rather than for a finished image, so the
 * card is one inline SVG with no data URLs and no asynchronous work: a class set of forty
 * cards renders in one pass and prints without waiting for anything to load.
 *
 * Error correction is set high on purpose. These end up on school paper, get folded into
 * pockets and read under classroom lighting, so a code that still scans with a corner
 * scuffed is worth the extra modules.
 */
export type QrMatrix = {
  /** Modules per side, without any quiet zone. */
  size: number;
  /** A single SVG path covering every dark module, in a 0..size coordinate space. */
  path: string;
};

export function createQrMatrix(text: string): QrMatrix {
  const code = QRCode.create(text, { errorCorrectionLevel: "H" });
  const size = code.modules.size;
  const data = code.modules.data;
  const segments: string[] = [];

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (data[row * size + column]) segments.push(`M${column} ${row}h1v1h-1z`);
    }
  }

  return { size, path: segments.join("") };
}

/**
 * The quiet zone a printed code needs around it. Four modules is the standard, and
 * skipping it is the usual reason a card that looks fine refuses to scan.
 */
export const QR_QUIET_ZONE = 4;

export function getQrViewBox(matrix: QrMatrix): string {
  const side = matrix.size + QR_QUIET_ZONE * 2;
  return `${-QR_QUIET_ZONE} ${-QR_QUIET_ZONE} ${side} ${side}`;
}
