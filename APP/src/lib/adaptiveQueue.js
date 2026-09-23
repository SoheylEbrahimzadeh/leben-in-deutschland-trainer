import { computeStatus, isRedAlert, STATUS } from "./progressStore.js";

/** Deterministic-seedable shuffle (Fisher-Yates). rng defaults to Math.random. */
export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Builds an error-first adaptive training queue over `questions`, using the
 * progress records in `perQuestion`.
 *
 * Priority: 1) RED ALERT (mistakeCount >= 3)  2) WEAK  3) UNCERTAIN
 *           4) UNPRACTICED                    5) MASTERED (periodic review)
 *
 * MASTERED questions are interleaved back in every `reviewEvery` slots so
 * long-mastered material still gets occasional spaced review, without
 * building a full spaced-repetition scheduler.
 */
export function buildAdaptiveQueue(questions, perQuestion, { rng = Math.random, reviewEvery = 8 } = {}) {
  const redAlert = [];
  const weak = [];
  const uncertain = [];
  const unpracticed = [];
  const mastered = [];

  for (const q of questions) {
    const record = perQuestion[q.id];
    if (isRedAlert(record)) {
      redAlert.push(q);
      continue;
    }
    const status = computeStatus(record);
    if (status === STATUS.WEAK) weak.push(q);
    else if (status === STATUS.UNCERTAIN) uncertain.push(q);
    else if (status === STATUS.UNPRACTICED) unpracticed.push(q);
    else mastered.push(q);
  }

  const primary = [
    ...shuffle(redAlert, rng),
    ...shuffle(weak, rng),
    ...shuffle(uncertain, rng),
    ...shuffle(unpracticed, rng),
  ];

  if (mastered.length === 0) return primary;

  const shuffledMastered = shuffle(mastered, rng);
  const result = [];
  let masteredIdx = 0;
  for (let i = 0; i < primary.length; i++) {
    result.push(primary[i]);
    if ((i + 1) % reviewEvery === 0 && masteredIdx < shuffledMastered.length) {
      result.push(shuffledMastered[masteredIdx++]);
    }
  }
  while (masteredIdx < shuffledMastered.length) {
    result.push(shuffledMastered[masteredIdx++]);
  }
  return result;
}

export function bucketCounts(questions, perQuestion) {
  const counts = {
    redAlert: 0,
    weak: 0,
    uncertain: 0,
    unpracticed: 0,
    mastered: 0,
  };
  for (const q of questions) {
    const record = perQuestion[q.id];
    if (isRedAlert(record)) {
      counts.redAlert += 1;
      continue;
    }
    const status = computeStatus(record);
    if (status === STATUS.WEAK) counts.weak += 1;
    else if (status === STATUS.UNCERTAIN) counts.uncertain += 1;
    else if (status === STATUS.UNPRACTICED) counts.unpracticed += 1;
    else counts.mastered += 1;
  }
  return counts;
}
