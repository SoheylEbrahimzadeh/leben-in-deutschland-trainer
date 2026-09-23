import { createPortal } from "react-dom";
import { useAuth } from "../lib/authContext.jsx";

/**
 * Shown exactly once, right after a first sign-in on a device that already
 * has local (guest) progress — never silently imported and never silently
 * skipped. See cloudSync.js's planLoginSync()/progressMerge.js for the
 * merge rules applied once the person picks "import".
 */
export default function MigrationPrompt() {
  const { migrationPrompt, confirmImport, declineImport, syncing } = useAuth();
  if (!migrationPrompt) return null;

  const { localState } = migrationPrompt;
  const questionCount = Object.keys(localState.perQuestion || {}).length;
  const examCount = (localState.mockExams || []).length;

  return createPortal(
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-head">
          <span className="modal-title fa">وارد کردن پیشرفت این دستگاه؟</span>
        </div>
        <p className="fa" style={{ marginTop: 0 }}>
          روی این دستگاه پیشرفت ذخیره‌شده‌ای پیدا شد: {questionCount} سؤال تمرین‌شده
          {examCount > 0 ? ` و ${examCount} آزمون آزمایشی` : ""}. می‌خواهی این پیشرفت به حساب کاربری‌ات اضافه شود؟
        </p>
        <p className="fa" style={{ fontSize: 12.5, color: "var(--text-faint)" }}>
          اگر حساب کاربری‌ات از قبل پیشرفتی دارد، چیزی رونویسی نمی‌شود — قوی‌ترین حالت هر سؤال (بیشترین اشتباهات ثبت‌شده،
          سپس بیشترین تلاش‌ها، سپس جدیدترین) نگه داشته می‌شود.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <button type="button" className="btn secondary" disabled={syncing} onClick={declineImport}>
            نه، از حساب کاربری شروع کن
          </button>
          <button type="button" className="btn" disabled={syncing} onClick={confirmImport}>
            {syncing ? "..." : "بله، اضافه کن"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
