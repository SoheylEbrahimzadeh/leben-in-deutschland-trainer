import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/authContext.jsx";
import AuthPanel from "./AuthPanel.jsx";
import { UserIcon, LogOutIcon, CloudIcon } from "./Icons.jsx";

/**
 * Header account area. Same component renders for both breakpoints — an
 * icon-only compact button on narrow/mobile widths, and (via CSS, see
 * `.account-btn .account-label`) an icon + short label on wider/desktop
 * widths, per the "avatar area on desktop, compact button on mobile"
 * requirement in a single header rather than two parallel UIs.
 *
 * Renders nothing at all when cloud sync isn't configured yet (no
 * VITE_SUPABASE_* env vars) — the header then looks exactly like it did
 * before Part 3, and guest/local-only mode is all there is.
 */
export default function AccountMenu() {
  const { isCloudConfigured, loading, syncing, user, signOut } = useAuth();
  const [panelOpen, setPanelOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  if (!isCloudConfigured) return null;
  if (loading) return <div className="account-btn account-btn-skeleton" aria-hidden="true" />;

  if (!user) {
    return (
      <>
        <button type="button" className="account-btn" onClick={() => setPanelOpen(true)}>
          <UserIcon width={16} height={16} />
          <span className="account-label fa">ورود</span>
        </button>
        {panelOpen && <AuthPanel onClose={() => setPanelOpen(false)} />}
      </>
    );
  }

  const initial = (user.email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="account-menu" ref={menuRef}>
      <button
        type="button"
        className="account-btn account-btn-signed-in"
        onClick={() => setMenuOpen((v) => !v)}
        aria-expanded={menuOpen}
      >
        <span className="account-avatar">{initial}</span>
        <span className="account-label">{user.email}</span>
      </button>

      {menuOpen && (
        <div className="account-dropdown">
          <div className="account-dropdown-email">{user.email}</div>
          <div className="account-dropdown-status fa">
            <CloudIcon width={13} height={13} />
            {syncing ? "در حال همگام‌سازی…" : "همگام با ابر"}
          </div>
          <button
            type="button"
            className="account-dropdown-logout"
            onClick={() => {
              setMenuOpen(false);
              signOut();
            }}
          >
            <LogOutIcon width={15} height={15} />
            <span className="fa">خروج · Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}
