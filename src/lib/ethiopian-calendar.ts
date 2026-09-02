import { toAddis } from "./time";

/**
 * Gregorian -> Ethiopian calendar conversion for DISPLAY ONLY
 * (docs/architecture.md §5 rule 6, docs/product.md §8). Never persist an Ethiopian date.
 *
 * Algorithm: convert the Gregorian date to a Julian Day Number, then to the
 * Ethiopian (Amete Mihret) calendar. Verified against known dates in the tests.
 */

// Julian Day Number of 1 Meskerem 1 (Amete Mihret epoch).
const JD_EPOCH_OFFSET_AMETE_MIHRET = 1723856;

export type EthiopianDate = {
  year: number;
  month: number; // 1..13 (month 13 = Pagume)
  day: number; // 1..30 (Pagume: 1..5, or 1..6 in a leap year)
};

/** Transliterated Ethiopian month names, index 0 = Meskerem. */
export const ETHIOPIAN_MONTHS_EN = [
  "Meskerem",
  "Tikimt",
  "Hidar",
  "Tahsas",
  "Tir",
  "Yekatit",
  "Megabit",
  "Miazia",
  "Ginbot",
  "Sene",
  "Hamle",
  "Nehase",
  "Pagume",
] as const;

/** Amharic Ethiopian month names, index 0 = Meskerem. */
export const ETHIOPIAN_MONTHS_AM = [
  "መስከረም",
  "ጥቅምት",
  "ኅዳር",
  "ታኅሳስ",
  "ጥር",
  "የካቲት",
  "መጋቢት",
  "ሚያዝያ",
  "ግንቦት",
  "ሰኔ",
  "ሐምሌ",
  "ነሐሴ",
  "ጳጉሜ",
] as const;

/** Positive modulo (JS `%` keeps the sign of the dividend). */
function mod(a: number, b: number): number {
  return ((a % b) + b) % b;
}

/** Julian Day Number for a proleptic Gregorian calendar date. */
function gregorianToJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/**
 * Convert a Gregorian calendar date (year, 1-based month, 1-based day) to its
 * Ethiopian equivalent.
 */
export function gregorianToEthiopian(year: number, month: number, day: number): EthiopianDate {
  const jdn = gregorianToJdn(year, month, day);
  const r = mod(jdn - JD_EPOCH_OFFSET_AMETE_MIHRET, 1461);
  const n = mod(r, 365) + 365 * Math.floor(r / 1460);

  const ethYear =
    4 * Math.floor((jdn - JD_EPOCH_OFFSET_AMETE_MIHRET) / 1461) +
    Math.floor(r / 365) -
    Math.floor(r / 1460);
  const ethMonth = Math.floor(n / 30) + 1;
  const ethDay = mod(n, 30) + 1;

  return { year: ethYear, month: ethMonth, day: ethDay };
}

/** Convert a UTC instant to the Ethiopian date shown in Addis time. */
export function toEthiopian(instant: Date): EthiopianDate {
  const addis = toAddis(instant);
  return gregorianToEthiopian(addis.year, addis.month, addis.day);
}

/** Format an Ethiopian date for display, e.g. "Meskerem 1, 2017". */
export function formatEthiopian(date: EthiopianDate, locale: "en" | "am" = "en"): string {
  const months = locale === "am" ? ETHIOPIAN_MONTHS_AM : ETHIOPIAN_MONTHS_EN;
  return `${months[date.month - 1]} ${date.day}, ${date.year}`;
}
