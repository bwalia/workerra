import { PHOTOS, photoSrc, photoSrcSet, type PhotoId } from "./photos";

/**
 * A responsive stock photo from the PHOTOS catalogue. The browser picks the
 * smallest variant that covers `sizes`; width and height reserve the space so
 * nothing shifts while it loads. Off-screen photos load lazily unless `priority`.
 *
 * Fills its box when given a size via className (object-cover crops to fit),
 * otherwise keeps the photo's own aspect ratio.
 */
export function Photo({
  id,
  sizes,
  className = "",
  priority = false,
}: {
  id: PhotoId;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  const photo = PHOTOS[id];
  return (
    // A plain <img>: next/image needs sharp to optimise in standalone mode,
    // which the runtime image doesn't ship, so variants are pre-built instead.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoSrc(id, 1024)}
      srcSet={photoSrcSet(id)}
      sizes={sizes}
      width={photo.width}
      height={photo.height}
      alt={photo.alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={`bg-subtle object-cover ${className}`}
    />
  );
}
