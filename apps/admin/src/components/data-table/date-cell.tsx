import { relativeDate } from "@/lib/format";

/**
 * The date cell every list column uses.
 *
 * It answers both questions a list is asked at once: the visible text is
 * relative, because scanning rows is about recency and urgency, and the
 * absolute day is on `title` (and in the `datetime` attribute) for the moment
 * the exact date matters. Two date columns rendered through this can be
 * compared against each other; `enviat` relative beside `caduca` numeric could
 * not. See the header of `src/lib/format.ts` for the whole convention.
 */
export function DateCell({ value }: { value: string | null | undefined }) {
  const { text, title } = relativeDate(value);

  if (title === undefined) {
    return <span className="text-muted-foreground">{text}</span>;
  }

  return (
    <time
      dateTime={value ?? undefined}
      title={title}
      className="whitespace-nowrap"
    >
      {text}
    </time>
  );
}
