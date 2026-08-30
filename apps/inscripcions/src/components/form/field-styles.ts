/**
 * The one type scale for the registration form.
 *
 * Every field imports these instead of styling its own hint and control, so a
 * new field cannot drift: there is exactly one place where a hint size or a
 * control height is decided. The scale is deliberately short — section
 * heading, control, hint — because the form only has a few roles of text and
 * inventing another is what made the old version read as typographically
 * noisy. Labels are not here any more: the shared `Label` decides their
 * weight for every app at once.
 */

/**
 * Section heading ("qui ets?"). One full step above a field label, so the
 * three groups are scannable before any label is read.
 */
export const SECTION_HEADING = "text-base font-semibold tracking-tight";

/**
 * Control height. HeroUI's fields size themselves from their padding, which
 * lands a little under 40px; 44px is the comfortable touch target and keeps
 * the degree combobox flush with the text inputs.
 */
export const FIELD_CONTROL = "h-11";

/**
 * Hint and validation text — one step below the label so help never competes
 * with the thing it is helping with. Reserved for the two facts a student
 * cannot guess; everything else lives in the label or the placeholder.
 */
export const FIELD_HINT = "text-xs leading-relaxed";
