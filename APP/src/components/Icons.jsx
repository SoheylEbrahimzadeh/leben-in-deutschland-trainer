/**
 * Small inline SVG icon set (stroke-based, feather-style, currentColor).
 * Kept dependency-free on purpose — no icon package, just the handful of
 * glyphs the redesigned UI actually needs.
 */
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function HomeIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

export function BookIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21" />
      <path d="M4 5.5V19a2 2 0 0 0 2 2h14" />
      <path d="M8 8h8M8 11.2h6" />
    </svg>
  );
}

export function AlertIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5 2.7 20h18.6L12 3.5Z" />
      <path d="M12 9.5v4.5" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ShieldIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3 4.5 5.8V11c0 5 3.3 8.2 7.5 10 4.2-1.8 7.5-5 7.5-10V5.8L12 3Z" />
      <path d="M9 12.2l2.1 2.1L15.3 10" />
    </svg>
  );
}

export function ExamIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 3.5h9l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M14.5 3.5V8h4" />
      <path d="M8.5 13.2 10.6 15.3 15.2 10.7" />
    </svg>
  );
}

export function ChartIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20V10M12 20V4M20 20v-7" />
      <path d="M2.5 20h19" />
    </svg>
  );
}

export function CheckCircleIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.2 12.3 10.7 14.8 15.8 9.4" />
    </svg>
  );
}

export function XCircleIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </svg>
  );
}

export function TranslateIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 5.5h9M8 3.5v2M5.2 5.5c.3 3.4 2.4 6 5.3 7.6M11 5.5c-.7 3.9-3.4 7.1-7.2 8.9" />
      <path d="M14 20.5 18 11l4 9.5M15.3 17.6h5.4" />
    </svg>
  );
}

export function BulbIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.45 1 1.2 1 2.1h5c0-.9.4-1.65 1-2.1A6 6 0 0 0 12 3Z" />
    </svg>
  );
}

export function TrapIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5M12 15.8h.01" />
    </svg>
  );
}

export function KeyIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="7.5" cy="14.5" r="3.5" />
      <path d="M10.6 11.9 18 4.5M15.3 7.2l2.2 2.2M18.4 4.1l1.6 1.6" />
    </svg>
  );
}

export function AnswerIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12.5 9 17.5 20 5.5" />
    </svg>
  );
}

export function ChevronIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function ImageIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
      <path d="M5 17.5 9.5 13l3 3 3-4 3.5 5.5" />
    </svg>
  );
}

export function SparkIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
    </svg>
  );
}
