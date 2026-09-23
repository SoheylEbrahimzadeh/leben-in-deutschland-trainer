import { useState } from "react";
import Dashboard from "./views/Dashboard.jsx";
import Train from "./views/Train.jsx";
import Mistakes from "./views/Mistakes.jsx";
import Hessen from "./views/Hessen.jsx";
import MockExam from "./views/MockExam.jsx";
import Progress from "./views/Progress.jsx";

const TABS = [
  { key: "dashboard", label: "داشبورد", icon: "🏠", Component: Dashboard },
  { key: "train", label: "تمرین", icon: "📖", Component: Train },
  { key: "mistakes", label: "اشتباهات", icon: "⚠️", Component: Mistakes },
  { key: "hessen", label: "هسن", icon: "🦁", Component: Hessen },
  { key: "mock", label: "آزمون", icon: "📝", Component: MockExam },
  { key: "progress", label: "پیشرفت", icon: "📊", Component: Progress },
];

export default function App() {
  const [view, setView] = useState("dashboard");
  const active = TABS.find((t) => t.key === view) ?? TABS[0];
  const ActiveComponent = active.Component;

  return (
    <>
      <header className="app-header">
        <h1>LiD Trainer · Hessen</h1>
        <div className="subtitle">Leben in Deutschland — 300 + 10 Fragen</div>
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
          >
            <span className="icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
