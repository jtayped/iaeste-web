/**
 * The one type scale for the registration form.
 *
 * Every field imports these instead of styling its own label, hint and
 * control, so a new field cannot drift: there is exactly one place where a
 * label weight or a hint size is decided. The scale is deliberately short —
 * section heading, label, control, hint — because the form only has four
 * roles of text and inventing a fifth is what made the old version read as
 * typographically noisy.
 */

/**
 * Section heading ("qui ets?"). One full step above a field label, so the
 * three groups are scannable before any label is read.
 */
export const SECTION_HEADING = "text-base font-semibold tracking-tight";

/** Field label. Matches the shared `Label` primitive so nothing shifts. */
export const FIELD_LABEL = "text-sm font-medium";

/**
 * Control height. `Input` ships at `h-9`; 44px is the comfortable touch
 * target and keeps the combobox trigger flush with the text inputs.
 */
export const FIELD_CONTROL = "h-11";

/**
 * Hint and validation text — one step below the label so help never competes
 * with the thing it is helping with. Reserved for the two facts a student
 * cannot guess; everything else lives in the label or the placeholder.
 */
export const FIELD_HINT = "text-xs leading-relaxed";
