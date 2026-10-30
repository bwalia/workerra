// Stock photography used across the site. Files live in public/images/photos as
// pre-sized WebP at PHOTO_WIDTHS (the runtime image has no sharp, so next/image
// can't optimise in standalone mode; see docs/images.md for how they're made).
//
// Every photo is under the Unsplash License: free for commercial use, no
// attribution or permission required. We keep the credit and source anyway so
// each one can be traced, and replaced (e.g. with licensed iStock images) by
// keeping the same id and dimensions.

export const PHOTO_WIDTHS = [640, 1024, 1600] as const;

export type PhotoId =
  | "hero-office"
  | "candidate-laptop"
  | "employer-interview"
  | "team-office"
  | "handshake"
  | "team-table"
  | "trades-site"
  | "hivis-team"
  | "resume-review";

export interface PhotoInfo {
  alt: string;
  /** Intrinsic size of the largest variant, for the aspect ratio. */
  width: number;
  height: number;
  credit: string;
  source: string;
}

export const PHOTOS: Record<PhotoId, PhotoInfo> = {
  "hero-office": {
    alt: "Two colleagues talking through a piece of work at a desk in a bright, modern office",
    width: 1600,
    height: 900,
    credit: "Vitaly Gariev",
    source: "https://unsplash.com/photos/E3TJIo5E9Gg",
  },
  "candidate-laptop": {
    alt: "Person in a mustard jumper typing on a laptop",
    width: 1600,
    height: 1067,
    credit: "Christin Hume",
    source: "https://unsplash.com/photos/Hcfwew744z4",
  },
  "employer-interview": {
    alt: "Interviewer in glasses taking notes while talking with a candidate across a desk",
    width: 1600,
    height: 900,
    credit: "Vitaly Gariev",
    source: "https://unsplash.com/photos/pg2eJwNVpvY",
  },
  "team-office": {
    alt: "Rows of people working at laptops in a large open-plan office",
    width: 1600,
    height: 1067,
    credit: "Alex Kotliarskyi",
    source: "https://unsplash.com/photos/QBpZGqEMsKg",
  },
  handshake: {
    alt: "Two people shaking hands across a table in an office",
    width: 1600,
    height: 1068,
    credit: "Cytonn Photography",
    source: "https://unsplash.com/photos/n95VMLxqM2I",
  },
  "team-table": {
    alt: "A small team working on laptops around a shared table",
    width: 1600,
    height: 1050,
    credit: "Annie Spratt",
    source: "https://unsplash.com/photos/hCb3lIB8L8E",
  },
  "trades-site": {
    alt: "Construction worker in a hard hat on a timber building frame",
    width: 1600,
    height: 1068,
    credit: "Josh Olalde",
    source: "https://unsplash.com/photos/X1P1_EDNnok",
  },
  "hivis-team": {
    alt: "Crew members in orange high-visibility workwear talking, seen from above",
    width: 1600,
    height: 1200,
    credit: "Ben Wicks",
    source: "https://unsplash.com/photos/ft_t7P46zrE",
  },
  "resume-review": {
    alt: "Interviewer reading a candidate's CV at a table",
    width: 1600,
    height: 1067,
    credit: "Resume Genius",
    source: "https://unsplash.com/photos/9si2noVCVH8",
  },
};

export const photoSrc = (id: PhotoId, width: number) => `/images/photos/${id}-${width}.webp`;

export const photoSrcSet = (id: PhotoId) => PHOTO_WIDTHS.map((w) => `${photoSrc(id, w)} ${w}w`).join(", ");
