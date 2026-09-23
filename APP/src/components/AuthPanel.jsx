import { useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../lib/authContext.jsx";
import { CloseIcon, CloudIcon } from "./Icons.jsx";

/**
 * Sign in / sign up modal. Guest mode is never forced — this only opens
 * when the person taps the header's "Sign in" button, and closing it
 * (backdrop or ✕) just returns to guest/local-only progress, unchanged.
 */
export default function AuthPanel({ onClose }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("signIn"); // "signIn" | "signUp"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    const fn = mode === "signIn" ? signIn : signUp;
    const { error: err } = await fn(email.trim(), password);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    if (mode === "signUp") {
      setInfo("حساب ساخته شد. اگر تأیید ایمیل فعال باشد، صندوق ایمیل خود را بررسی کن، سپس وارد شو. · Konto erstellt.");
      setMode("signIn");
      return;
    }
    onClose();
  }

  // Rendered via a portal straight onto <body>: this component is mounted
  // from AccountMenu, which lives inside the sticky <header> — and that
  // header has `backdrop-filter` set, which (per the CSS spec) makes it a
  // new containing block for any `position: fixed` descendant. Without the
  // portal, this modal's fixed overlay would be clipped to the header's own
  // small box instead of covering the viewport.
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CloudIcon width={18} height={18} style={{ color: "var(--gold)" }} />
            <span className="modal-title fa">همگام‌سازی ابری · Cloud-Sync</span>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="بستن">
            <CloseIcon width={18} height={18} />
          </button>
        </div>

        <div className="auth-tabs">
          <button type="button" className={mode === "signIn" ? "active" : ""} onClick={() => setMode("signIn")}>
            ورود · Anmelden
          </button>
          <button type="button" className={mode === "signUp" ? "active" : ""} onClick={() => setMode("signUp")}>
            ثبت‌نام · Registrieren
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="form-field">
            <span className="fa">ایمیل · E-Mail</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </label>
          <label className="form-field">
            <span className="fa">رمز عبور · Passwort</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          {error && <p className="form-error fa">{error}</p>}
          {info && <p className="form-info fa">{info}</p>}

          <button type="submit" className="btn" disabled={busy} style={{ marginTop: 4 }}>
            {busy ? "..." : mode === "signIn" ? "ورود · Anmelden" : "ساخت حساب · Registrieren"}
          </button>
        </form>

        <p className="fa" style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 14, marginBottom: 0, textAlign: "center" }}>
          پیشرفت فعلی این دستگاه پس از ورود می‌تواند به حساب کاربری‌ات اضافه شود.
        </p>
      </div>
    </div>,
    document.body
  );
}
