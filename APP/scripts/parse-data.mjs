#!/usr/bin/env node
/**
 * Parses the authoritative DATA/*.md source files into a single JSON file
 * consumed by the app at build time.
 *
 * DATA INTEGRITY RULE: this script only READS DATA/. It never writes to it,
 * never "corrects" wording, and never invents a value. Any question whose
 * shape does not match the expected pattern, or whose merged fields
 * disagree, is emitted with `flagged: "NOT VERIFIED"` plus a reason instead
 * of being silently guessed. The build fails (non-zero exit) if the total
 * count is not exactly 310 or if there are duplicate IDs, since those two
 * conditions can never be legitimate.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../DATA");
const OUT_DIR = path.resolve(__dirname, "../src/data");
const OUT_FILE = path.join(OUT_DIR, "questions.generated.json");
const REPORT_FILE = path.join(OUT_DIR, "parse-report.generated.json");

function read(file) {
  return readFileSync(path.join(DATA_DIR, file), "utf8");
}

/** Split a source file into per-question raw blocks keyed by ID. */
function splitBlocks(text, headingRe) {
  const lines = text.split("\n");
  const blocks = new Map();
  let currentId = null;
  let buf = [];
  for (const line of lines) {
    const m = line.match(headingRe);
    if (m) {
      if (currentId) blocks.set(currentId, buf.join("\n"));
      currentId = m[1];
      buf = [];
    } else if (currentId) {
      buf.push(line);
    }
  }
  if (currentId) blocks.set(currentId, buf.join("\n"));
  return blocks;
}

function field(block, label) {
  // Matches "Label: value" on a single line (source files use this shape).
  const re = new RegExp(`^${label}:\\s*(.*)$`, "m");
  const m = block.match(re);
  return m ? m[1].trim() : null;
}

function blockField(block, label) {
  // Matches teaching-cards.md shape:
  // LABEL:
  // <value, possibly multi-line, until the next ALLCAPS label or block end>
  const re = new RegExp(
    `^${label}:\\s*\\n([\\s\\S]*?)(?=\\n[A-ZÄÖÜ][A-ZÄÖÜ \\u2014-]*:\\s*\\n|\\n*$)`,
    "m"
  );
  const m = block.match(re);
  return m ? m[1].trim() : null;
}

function parseSourceFile(text, headingRe) {
  const blocks = splitBlocks(text, headingRe);
  const out = new Map();
  for (const [id, block] of blocks) {
    const questionType = field(block, "Question Type");
    const bundesland = field(block, "Bundesland");
    const officialQuestion = field(block, "Official Question");
    const a = field(block, "A");
    const b = field(block, "B");
    const c = field(block, "C");
    const d = field(block, "D");
    const correctRaw = field(block, "Correct Answer");
    const source = field(block, "Source");
    const verification = field(block, "Verification Status");
    const correctLetter = correctRaw ? correctRaw.trim()[0] : null;
    out.set(id, {
      id,
      questionType,
      bundesland,
      question: officialQuestion,
      options: { A: a, B: b, C: c, D: d },
      correctAnswer: correctLetter,
      correctAnswerRaw: correctRaw,
      source,
      verificationStatus: verification,
    });
  }
  return out;
}

function parseTeachingCards(text) {
  const blocks = splitBlocks(text, /^## Question ID:\s*(\S+)/);
  const out = new Map();
  for (const [id, block] of blocks) {
    const topic = field(block, "Topic");
    const germanQuestion = blockField(block, "GERMAN QUESTION");
    const a = blockField(block, "A");
    const b = blockField(block, "B");
    const c = blockField(block, "C");
    const d = blockField(block, "D");
    const correctRaw = blockField(block, "CORRECT ANSWER");
    const translation = blockField(block, "PERSIAN TRANSLATION");
    const correctPersian = blockField(block, "CORRECT ANSWER — PERSIAN");
    const explanation = blockField(block, "SIMPLE EXPLANATION");
    const memoryTrick = blockField(block, "MEMORY TRICK");
    const trap = blockField(block, "TRAP");
    const keywordsRaw = blockField(block, "KEYWORDS");
    const correctLetter = correctRaw ? correctRaw.trim()[0] : null;
    out.set(id, {
      id,
      topic,
      germanQuestion,
      options: { A: a, B: b, C: c, D: d },
      correctAnswer: correctLetter,
      correctAnswerRaw: correctRaw,
      translation,
      correctAnswerPersian: correctPersian,
      explanation,
      memoryTrick,
      trap: trap || null,
      keywords: keywordsRaw
        ? keywordsRaw.split(",").map((k) => k.trim()).filter(Boolean)
        : [],
    });
  }
  return out;
}

function parseQuestionIndex(text) {
  // Table rows: | Question ID | Category | State | Verification Status | Visual |
  const visualById = new Map();
  const rowRe = /^\|\s*([GH]\d+)\s*\|[^|]*\|[^|]*\|[^|]*\|\s*(yes|no)\s*\|$/gim;
  let m;
  while ((m = rowRe.exec(text))) {
    visualById.set(m[1], m[2].toLowerCase() === "yes");
  }
  return visualById;
}

function main() {
  const report = { generatedAt: new Date().toISOString(), issues: [] };

  const generalSrc = parseSourceFile(
    read("bamf-general-300.md"),
    /^## Question ID:\s*(\S+)/
  );
  const hessenSrc = parseSourceFile(
    read("hessen-10.md"),
    /^## Question ID:\s*(\S+)/
  );
  const teaching = parseTeachingCards(read("teaching-cards.md"));
  const visualById = parseQuestionIndex(read("question-index.md"));

  const sourceCombined = new Map([...generalSrc, ...hessenSrc]);

  if (generalSrc.size !== 300) {
    report.issues.push(
      `FATAL: expected 300 General questions, found ${generalSrc.size}`
    );
  }
  if (hessenSrc.size !== 10) {
    report.issues.push(
      `FATAL: expected 10 Hessen questions, found ${hessenSrc.size}`
    );
  }
  if (sourceCombined.size !== 310) {
    report.issues.push(
      `FATAL: expected 310 combined unique IDs, found ${sourceCombined.size}`
    );
  }

  const questions = [];
  for (const [id, src] of sourceCombined) {
    const tc = teaching.get(id);
    const flags = [];

    if (!tc) {
      flags.push("NOT VERIFIED: missing teaching-cards.md entry");
    } else {
      if (tc.correctAnswer && src.correctAnswer && tc.correctAnswer !== src.correctAnswer) {
        flags.push(
          `NOT VERIFIED: correct-answer mismatch between source (${src.correctAnswer}) and teaching-cards (${tc.correctAnswer})`
        );
      }
      for (const letter of ["A", "B", "C", "D"]) {
        if (!tc.options[letter]) {
          flags.push(`NOT VERIFIED: teaching-cards missing option ${letter}`);
        }
      }
    }
    for (const letter of ["A", "B", "C", "D"]) {
      if (!src.options[letter]) {
        flags.push(`NOT VERIFIED: source missing option ${letter}`);
      }
    }
    if (!src.correctAnswer || !["A", "B", "C", "D"].includes(src.correctAnswer)) {
      flags.push("NOT VERIFIED: source has no valid correct answer letter");
    }
    if (!src.question) {
      flags.push("NOT VERIFIED: source missing question text");
    }

    const category = id.startsWith("H") ? "Hessen" : "General";

    const question = {
      id,
      category,
      bundesland: src.bundesland,
      question: src.question, // German original, verbatim from source
      options: src.options, // German original options, verbatim from source
      correctAnswer: src.correctAnswer, // authoritative, from source (never from teaching-cards)
      source: src.source,
      verificationStatus: src.verificationStatus,
      visual: visualById.has(id) ? visualById.get(id) : /\[IMAGE/i.test(src.question || ""),
      persian: tc
        ? {
            topic: tc.topic,
            translation: tc.translation,
            correctAnswerPersian: tc.correctAnswerPersian,
            explanation: tc.explanation,
            memoryTrick: tc.memoryTrick,
            trap: tc.trap,
            keywords: tc.keywords,
          }
        : null,
      flagged: flags.length > 0 ? flags : null,
    };
    questions.push(question);
    if (flags.length) {
      report.issues.push({ id, flags });
    }
  }

  // Stable order: G001..G300 then H01..H10
  questions.sort((x, y) => {
    if (x.category !== y.category) return x.category === "General" ? -1 : 1;
    return x.id.localeCompare(y.id, undefined, { numeric: true });
  });

  const generalCount = questions.filter((q) => q.category === "General").length;
  const hessenCount = questions.filter((q) => q.category === "Hessen").length;
  const visualCount = questions.filter((q) => q.visual).length;

  report.totals = {
    combined: questions.length,
    general: generalCount,
    hessen: hessenCount,
    visual: visualCount,
    flaggedQuestions: questions.filter((q) => q.flagged).length,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(questions, null, 2) + "\n", "utf8");
  writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2) + "\n", "utf8");

  console.log("Parse report:", JSON.stringify(report.totals, null, 2));
  if (report.issues.some((i) => typeof i === "string" && i.startsWith("FATAL"))) {
    console.error("FATAL data integrity issue(s):", report.issues);
    process.exit(1);
  }
  if (questions.length !== 310) {
    console.error(`FATAL: expected 310 total questions, got ${questions.length}`);
    process.exit(1);
  }
  const ids = new Set(questions.map((q) => q.id));
  if (ids.size !== questions.length) {
    console.error("FATAL: duplicate question IDs detected");
    process.exit(1);
  }
  console.log(`OK: ${questions.length} questions parsed (${generalCount} General + ${hessenCount} Hessen).`);
}

main();
