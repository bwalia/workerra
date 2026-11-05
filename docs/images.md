# Images and fonts

## Photos

Site photography lives in `public/images/photos/` and is catalogued in
`src/shared/ui/photos.ts` (alt text, size, photographer, source). Pages render
it with `<Photo id="…" sizes="…" />` from `@/shared/ui`.

### Licence

Every photo currently on the site is from Unsplash under the
[Unsplash License](https://unsplash.com/license): free for commercial use, no
permission or attribution required. It doesn't allow selling the photos
unaltered or using them to build a competing stock service, which we don't do.
We still record the photographer and source page for each one.

| Id | Used on | Photographer | Source |
| --- | --- | --- | --- |
| `hero-office` | Home hero, `/alerts` | Vitaly Gariev | https://unsplash.com/photos/E3TJIo5E9Gg |
| `candidate-laptop` | Home "How it works", `/applications` | Christin Hume | https://unsplash.com/photos/Hcfwew744z4 |
| `employer-interview` | Home "How it works", `/recruiters` | Vitaly Gariev | https://unsplash.com/photos/pg2eJwNVpvY |
| `team-office` | Home sectors (technology), `/blog` | Alex Kotliarskyi | https://unsplash.com/photos/QBpZGqEMsKg |
| `trades-site` | Home sectors (construction) | Josh Olalde | https://unsplash.com/photos/X1P1_EDNnok |
| `hivis-team` | Home sectors (logistics), centre-cropped to 4:3 | Ben Wicks | https://unsplash.com/photos/ft_t7P46zrE |
| `team-table` | Home sectors (marketing and creative), `/recruiters/pipeline` | Annie Spratt | https://unsplash.com/photos/hCb3lIB8L8E |
| `handshake` | `/about` hero | Cytonn Photography | https://unsplash.com/photos/n95VMLxqM2I |
| `resume-review` | `/candidates` | Resume Genius | https://unsplash.com/photos/9si2noVCVH8 |

Only use images we hold a licence for. iStock (Getty) images need a purchased
licence (credits or a subscription) in the company's name before they go on
the site; never use watermarked comps. Keep the licence receipt or download
record with the asset ID alongside this table.

### Adding or replacing a photo

The runtime image has no `sharp`, so `next/image` can't optimise in standalone
mode. Photos are pre-sized instead, at each width in `PHOTO_WIDTHS`
(640, 1024, 1600), as WebP:

```bash
for w in 640 1024 1600; do
  cwebp -q 72 -m 6 -metadata none -resize $w 0 original.jpg -o public/images/photos/<id>-$w.webp
done
```

Then add or update the entry in `photos.ts` with the 1600px variant's real
width and height and descriptive alt text. `photos.test.ts` fails if a variant
is missing or the recorded size is wrong. Photos are cached for a week, so a
replacement under a new id rolls out at once; one under the same id can take
up to a week to reach returning visitors.

## Fonts

Inter (text) and Plus Jakarta Sans (headings and the wordmark), both
OFL-1.1, self-hosted from the `@fontsource-variable/*` packages through
`next/font/local` in `src/shared/ui/fonts.ts`. Builds don't need to reach Google
Fonts. `h1`–`h3` pick up the heading face from `globals.css`; use `font-display`
for anything else that should match.
