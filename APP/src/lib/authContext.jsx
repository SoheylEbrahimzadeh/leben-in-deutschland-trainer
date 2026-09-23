import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { supabase, isCloudConfigured } from "./supabaseClient.js";
import { resetAllProgress } from "./progressStore.js";
import { planLoginSync, importLocalProgressAndMerge, skipLocalImport, flushPendingSync } from "./cloudSync.js";

const AuthContext = createContext(null);

/**
 * Wraps the whole app. Owns the Supabase session, drives the login-time
 * migration/merge flow (see cloudSync.js / progressMerge.js), and flushes
 * the offline write queue when the network comes back.
 *
 * Guest mode (no session, or cloud sync not configured at all) is the
 * default and is never forced: every Train/Hessen/Mistakes/Progress/Mock
 * Exam screen keeps working exactly as before, purely on localStorage,
 * whether or not this provider ever sees a signed-in user.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isCloudConfigured);
  const [syncing, setSyncing] = useState(false);
  const [migrationPrompt, setMigrationPrompt] = useState(null); // { localState } | null
  const [authError, setAuthError] = useState(null);
  const handledUserRef = useRef(null); // avoids re-running the login sync twice for the same session

  const runLoginSync = useCallback(async (userId) => {
    setSyncing(true);
    setAuthError(null);
    try {
      const plan = await planLoginSync(userId);
      if (plan.action === "needsImportChoice") {
        setMigrationPrompt({ userId, localState: plan.localState });
      }
    } catch (err) {
      // Cloud sync failing must never block using the app — fall back to
      // whatever is already in localStorage (guest-equivalent behavior).
      setAuthError(err?.message || "Cloud sync failed");
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (!isCloudConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Drive the login-sync flow whenever a NEW signed-in user appears.
  useEffect(() => {
    const userId = session?.user?.id || null;
    if (!userId) {
      handledUserRef.current = null;
      return;
    }
    if (handledUserRef.current === userId) return;
    handledUserRef.current = userId;
    runLoginSync(userId);
  }, [session, runLoginSync]);

  // Retry any offline-queued cloud writes once the network is back.
  useEffect(() => {
    if (!isCloudConfigured) return undefined;
    const onOnline = () => {
      if (session?.user?.id) flushPendingSync();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [session]);

  const signUp = useCallback(async (email, password) => {
    if (!isCloudConfigured) return { error: "Cloud sync is not configured." };
    setAuthError(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setAuthError(error.message);
    return { error: error?.message ?? null };
  }, []);

  const signIn = useCallback(async (email, password) => {
    if (!isCloudConfigured) return { error: "Cloud sync is not configured." };
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    if (!isCloudConfigured) return;
    // Best-effort: give any still-queued offline writes one last chance to
    // reach this account's cloud rows before the local copy is cleared.
    await flushPendingSync().catch(() => {});
    await supabase.auth.signOut();
    // Prevents this device's local progress (which belongs to the account
    // that just signed out) from leaking into whatever account signs in
    // next on the same browser — see authContext.jsx module comment.
    // The data itself is safe: it is already synced to this user's cloud
    // profile and is restored automatically next time they sign back in.
    resetAllProgress();
    handledUserRef.current = null;
  }, []);

  const confirmImport = useCallback(async () => {
    if (!migrationPrompt) return;
    setSyncing(true);
    try {
      await importLocalProgressAndMerge(migrationPrompt.userId);
    } finally {
      setSyncing(false);
      setMigrationPrompt(null);
    }
  }, [migrationPrompt]);

  const declineImport = useCallback(async () => {
    if (!migrationPrompt) return;
    setSyncing(true);
    try {
      await skipLocalImport(migrationPrompt.userId);
    } finally {
      setSyncing(false);
      setMigrationPrompt(null);
    }
  }, [migrationPrompt]);

  const value = {
    isCloudConfigured,
    loading,
    syncing,
    session,
    user: session?.user ?? null,
    authError,
    migrationPrompt,
    signUp,
    signIn,
    signOut,
    confirmImport,
    declineImport,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // Outside a provider (shouldn't happen in the app, but keeps this hook
    // safe to call defensively): behave exactly like guest/cloud-disabled.
    return {
      isCloudConfigured: false,
      loading: false,
      syncing: false,
      session: null,
      user: null,
      authError: null,
      migrationPrompt: null,
      signUp: async () => ({ error: "Not available" }),
      signIn: async () => ({ error: "Not available" }),
      signOut: async () => {},
      confirmImport: async () => {},
      declineImport: async () => {},
    };
  }
  return ctx;
}
