// Minimal, localStorage-backed offline write queue for cloud sync.
//
// WHY THIS EXISTS (documented per the Part 3 "offline/network behavior"
// requirement): a learner can answer a question or finish a mock exam while
// briefly offline (spotty connection, airplane mode between train stops).
// The local write ALWAYS succeeds first (progressStore.js/localStorage is
// unaffected by network state), so nothing about answering a question is
// ever blocked or lost. This queue only concerns the CLOUD copy: if a push
// to Supabase fails because the network is unavailable, the write is
// appended here instead of being silently dropped, and cloudSync.js
// flushes the queue (in order) on the browser's `online` event and once at
// app/login startup. This is deliberately NOT a general offline-first sync
// engine (no conflict resolution beyond what progressMerge.js already does,
// no retry backoff, no background service worker) — a small queue that
// survives a reload is enough for this app's scale, per the explicit
// "do not overengineer" instruction.
const QUEUE_KEY = "lid-trainer-sync-queue-v1";

export function loadQueue() {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueue(queue) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // best-effort; a full/blocked localStorage should never crash the app
  }
}

/** entry: { type: "question" | "exam", userId, ...payload } */
export function enqueue(entry) {
  const queue = loadQueue();
  queue.push({ ...entry, queuedAt: new Date().toISOString() });
  saveQueue(queue);
}

export function clearQueue() {
  saveQueue([]);
}

export function hasQueuedWrites() {
  return loadQueue().length > 0;
}

/**
 * Processes the queue in order using `handler(entry) => Promise<boolean>`
 * (true = synced, remove it). Stops at the first failure so a still-down
 * network doesn't burn through retries out of order; whatever is left
 * un-flushed stays queued for the next attempt.
 */
export async function flushQueue(handler) {
  const queue = loadQueue();
  let i = 0;
  for (; i < queue.length; i++) {
    let ok = false;
    try {
      ok = await handler(queue[i]);
    } catch {
      ok = false;
    }
    if (!ok) break;
  }
  const remaining = queue.slice(i);
  saveQueue(remaining);
  return { flushed: i, remaining: remaining.length };
}
