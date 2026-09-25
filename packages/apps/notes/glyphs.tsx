// Glyphs the shared webp set lacks, drawn small. Everything is currentColor
// so a glyph tints exactly like a Sym mask.

/** The attachment paperclip a list row wears when its note has a table or an image. */
export const ClipGlyph = ({ size = 11 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M18.6 11.8l-7.9 7.9a5 5 0 0 1-7.1-7.1l8.4-8.4a3.4 3.4 0 0 1 4.8 4.8l-8.2 8.2a1.8 1.8 0 0 1-2.5-2.5l7.3-7.3" />
  </svg>
)

/** The tag strip's hash, drawn so `#tag` chips and pages get a real glyph. */
export const TagGlyph = ({ size = 15 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.1"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M9.4 4.4 7.6 19.6M16.4 4.4l-1.8 15.2M4.8 8.8h15.2M4 15.2h15.2" />
  </svg>
)

/** Recently Deleted's bin row icon. */
export const TrashBadge = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M4.6 6.4h14.8M9.4 6V4.6A1.4 1.4 0 0 1 10.8 3.2h2.4a1.4 1.4 0 0 1 1.4 1.4V6M6.6 6.6l.8 12a2 2 0 0 0 2 1.8h5.2a2 2 0 0 0 2-1.8l.8-12" />
    <path d="M12 10.4v6.4" opacity=".55" />
  </svg>
)
