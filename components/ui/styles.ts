// Shared surface/typography classes (dark only). Compose with layout classes at call sites.

/** Card surface: lists, hero blocks, hotel cards. */
export const CARD = "rounded-2xl bg-zinc-900 ring-1 ring-white/5";

/** Tappable card: CARD + pressed state. */
export const CARD_BUTTON = `${CARD} text-left transition-colors active:bg-zinc-800`;

/** Section heading above a group ("Schedule", "Planned on"). */
export const SECTION_HEADING = "text-xs font-semibold uppercase tracking-wider text-zinc-500";

/** Small pill chip (meta, filters use their own sizing for 44px targets). */
export const CHIP = "inline-flex items-center rounded-full bg-zinc-800 px-2.5 py-0.5 text-sm text-zinc-300";

/** Emoji tile used in rows and heroes. */
export const EMOJI_TILE = "flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-2xl";
