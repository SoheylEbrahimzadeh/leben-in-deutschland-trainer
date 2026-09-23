import { useState } from "react";
import Dashboard from "./views/Dashboard.jsx";
import Train from "./views/Train.jsx";
import Mistakes from "./views/Mistakes.jsx";
import Hessen from "./views/Hessen.jsx";
import MockExam from "./views/MockExam.jsx";
import Progress from "./views/Progress.jsx";
import { HomeIcon, BookIcon, AlertIcon, ShieldIcon, ExamIcon, ChartIcon } from "./components/Icons.jsx";

const TABS = [
  { key: "dashboard", label: "داشبورد", Icon: HomeIcon, Component: Dashboard },
  { key: "train", label: "تمرین", Icon: BookIcon, Component: Train },
  { key: "mistakes", label: "اشتباهات", Icon: AlertIcon, Component: Mistakes },
  { key: "hessen", label: "هسن", Icon: ShieldIcon, Component: Hessen },
  { key: "mock", label: "آزمون", Icon: ExamIcon, Component: MockExam },
  { key: "progress", label: "پیشرفت", Icon: ChartIcon, Component: Progress },
];

export default function App() {
  const [view, setView] = useState("dashboard");
  const active = TABS.find((t) => t.key === view) ?? TABS[0];
  const ActiveComponent = active.Component;

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-brand-mark" aria-hidden="true">
            <ShieldIcon width={15} height={15} strokeWidth={2.3} />
          </div>
          <div className="app-header-text">
            <h1>LiD Trainer · Hessen</h1>
            <div className="subtitle">Leben in Deutschland — 300 + 10 Fragen</div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <ActiveComponent navigate={setView} />
      </main>

      <nav className="bottom-nav">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={t.key === view ? "active" : ""}
            onClick={() => setView(t.key)}
            aria-current={t.key === view ? "page" : undefined}
          >
            <t.Icon aria-hidden="true" />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
