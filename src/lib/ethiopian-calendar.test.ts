import test from "node:test";
import assert from "node:assert/strict";
import { gregorianToEthiopian } from "./ethiopian-calendar";

// Ethiopian calendar conversion is easy to get subtly wrong, so pin known dates.

test("Ethiopian New Year (Meskerem 1, 2017) falls on 2024-09-11", () => {
  assert.deepEqual(gregorianToEthiopian(2024, 9, 11), { year: 2017, month: 1, day: 1 });
});

test("Pagume 6 (leap year) is 2015-13-06 on 2023-09-11", () => {
  // 2015 EC is a leap year (2015 % 4 === 3), so Pagume has 6 days.
  assert.deepEqual(gregorianToEthiopian(2023, 9, 11), { year: 2015, month: 13, day: 6 });
});

test("Mid-year date 2024-01-01 is Tahsas 22, 2016", () => {
  assert.deepEqual(gregorianToEthiopian(2024, 1, 1), { year: 2016, month: 4, day: 22 });
});
