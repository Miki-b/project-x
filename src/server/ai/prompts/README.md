# Prompts

Prompts are **versioned files**, not inline strings (docs/architecture.md §10 rule 7),
so output changes are reviewable in git.

Each prompt lives in its own file here (e.g. `parse-tasks.v1.txt`, `daily-summary.v1.txt`)
and is loaded by the corresponding function in `src/server/ai`. Prompts demand JSON with
no prose or fences; every response is Zod-validated before use (see `../schemas.ts`).

No prompt content exists yet — added during feature work.
