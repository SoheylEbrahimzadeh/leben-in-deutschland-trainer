import raw from "../data/questions.generated.json";

// `raw` is generated at build time by scripts/parse-data.mjs from the
// immutable DATA/*.md source files. This module never mutates it.
export const ALL_QUESTIONS = raw;
export const GENERAL_QUESTIONS = raw.filter((q) => q.category === "General");
export const HESSEN_QUESTIONS = raw.filter((q) => q.category === "Hessen");

const byId = new Map(raw.map((q) => [q.id, q]));
export function getQuestionById(id) {
  return byId.get(id) || null;
}

export const TOTAL_COUNT = raw.length;
export const FLAGGED_QUESTIONS = raw.filter((q) => q.flagged);
