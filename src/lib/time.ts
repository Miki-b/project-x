import { DateTime } from "luxon";

/**
 * UTC <-> Africa/Addis_Ababa helpers (docs/architecture.md §5 rule 5).
 * Timestamps are stored in UTC; conversion to Addis time happens only at the
 * display and scheduling boundary. Ethiopia has no DST, but the rule is applied
 * uniformly regardless.
 */

export const ADDIS_TZ = "Africa/Addis_Ababa";

/** Current instant (UTC). Thin wrapper so scheduling code has a single clock source. */
export function nowUtc(): Date {
  return new Date();
}

/** Interpret a UTC instant as Addis-local wall-clock time. */
export function toAddis(instant: Date): DateTime {
  return DateTime.fromJSDate(instant, { zone: "utc" }).setZone(ADDIS_TZ);
}

/** Convert an Addis wall-clock date/time to the corresponding UTC instant. */
export function addisWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): Date {
  return DateTime.fromObject({ year, month, day, hour, minute }, { zone: ADDIS_TZ })
    .toUTC()
    .toJSDate();
}

/** UTC instant at the start of the Addis-local day containing `instant`. */
export function startOfAddisDayUtc(instant: Date): Date {
  return toAddis(instant).startOf("day").toUTC().toJSDate();
}

/** Format a UTC instant in Addis time. Default: `yyyy-LL-dd HH:mm`. */
export function formatInAddis(instant: Date, format = "yyyy-LL-dd HH:mm"): string {
  return toAddis(instant).toFormat(format);
}
