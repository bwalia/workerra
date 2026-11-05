import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PHOTOS, PHOTO_WIDTHS, photoSrc, photoSrcSet, type PhotoId } from "./photos";

const PUBLIC = join(process.cwd(), "public");

// Width and height from a lossy (VP8) or lossless (VP8L) WebP header.
function webpSize(file: string): { width: number; height: number } {
  const buf = readFileSync(file);
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8 ") return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  if (chunk === "VP8X") return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
  throw new Error(`unexpected WebP chunk ${chunk} in ${file}`);
}

describe("photo catalogue", () => {
  const ids = Object.keys(PHOTOS) as PhotoId[];

  it.each(ids)("%s has every width variant on disk", (id) => {
    for (const w of PHOTO_WIDTHS) {
      const file = join(PUBLIC, photoSrc(id, w));
      expect(existsSync(file), file).toBe(true);
      expect(webpSize(file).width).toBe(w);
    }
  });

  it.each(ids)("%s records the real size of its largest variant", (id) => {
    const largest = PHOTO_WIDTHS[PHOTO_WIDTHS.length - 1];
    expect(webpSize(join(PUBLIC, photoSrc(id, largest)))).toEqual({ width: PHOTOS[id].width, height: PHOTOS[id].height });
  });

  it.each(ids)("%s has alt text and a traceable source", (id) => {
    expect(PHOTOS[id].alt.length).toBeGreaterThan(10);
    expect(PHOTOS[id].source).toMatch(/^https:\/\//);
  });

  it("builds a srcset with one entry per width", () => {
    expect(photoSrcSet("handshake")).toBe(
      "/images/photos/handshake-640.webp 640w, /images/photos/handshake-1024.webp 1024w, /images/photos/handshake-1600.webp 1600w",
    );
  });
});
