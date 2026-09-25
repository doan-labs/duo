// Glyphs the shared webp set lacks, drawn small. Everything is currentColor
// so a glyph tints exactly like a Sym mask.

/** The self-timer's clock with its winding arrow, Apple's `timer` symbol. */
export const TimerGlyph = ({ size = 17 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M12 5.2a6.8 6.8 0 1 1-6.6 8.4" />
    <path d="M3.2 9.6l1.5 3.4 3-2" />
    <path d="M12 8.4v3.9l2.7 1.6" />
  </svg>
)

/** The autofocus reticle's corner brackets, which iOS draws around a tap. */
export const FocusGlyph = ({ size = 76 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M2.6 7.4V4.8a2.2 2.2 0 0 1 2.2-2.2h2.6" />
    <path d="M16.6 2.6h2.6a2.2 2.2 0 0 1 2.2 2.2v2.6" />
    <path d="M21.4 16.6v2.6a2.2 2.2 0 0 1-2.2 2.2h-2.6" />
    <path d="M7.4 21.4H4.8a2.2 2.2 0 0 1-2.2-2.2v-2.6" />
  </svg>
)
