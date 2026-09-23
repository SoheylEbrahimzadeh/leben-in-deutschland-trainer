import { createClient } from "@supabase/supabase-js";

/**
 * Cloud-sync configuration.
 *
 * SECURITY: only the Supabase URL and the ANON/PUBLIC key are ever read
 * here, both via Vite's build-time `import.meta.env.VITE_*` mechanism. The
 * anon key is safe to ship in a static frontend bundle — it identifies the
 * project, not a privileged user, and every table it can touch is locked
 * down with Row Level Security (see supabase/schema.sql at the repo root).
 * The Supabase service-role key is NEVER read, imported, or referenced
 * anywhere in this app; it must never be set as a VITE_-prefixed variable
 * because Vite would then bake it into the public client bundle.
 *
 * When these env vars are absent (e.g. a fork/PR build, or before the repo
 * owner has provisioned a Supabase project), the app runs entirely in
 * guest/local mode: `supabase` is null and every cloud-sync call becomes a
 * no-op. Nothing about Train/Hessen/Mistakes/Progress/Mock Exam changes.
 */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const isCloudConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isCloudConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
