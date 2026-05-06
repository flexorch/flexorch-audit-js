/**
 * Generates assets/demo.svg — terminal-style screenshot of the audit() demo.
 * Run: node demo/generate_svg.js
 */
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Dracula palette ──────────────────────────────────────────────────────────

const BG       = "#282a36";
const FG       = "#f8f8f2";
const GREEN    = "#50fa7b";
const YELLOW   = "#f1fa8c";
const CYAN     = "#8be9fd";
const COMMENT  = "#6272a4";
const REDACTED = "#ff5555";

// ── Output lines ──────────────────────────────────────────────────────────────

const LINES = [
  ["prompt",  "$ node demo/demo.js"],
  ["blank"],
  ["kv",      "  Grade  : ", "A",             "   (score: 0.86)"],
  ["kv",      "  PII    : ", "4 finding(s)",  ""],
  ["pii",     "           email                  ×1"],
  ["pii",     "           iban                   ×1"],
  ["pii",     "           name                   ×1"],
  ["pii",     "           national_id_tr         ×1"],
  ["blank"],
  ["label",   "  Masked output:"],
  ["text",    "  Contract #1042  —  Employment Agreement"],
  ["blank"],
  ["text",    "  Full Name: [REDACTED_NAME]"],
  ["text",    "  TC Kimlik: [REDACTED_NATIONAL_ID_TR]"],
  ["text",    "  E-mail: [REDACTED_EMAIL]"],
  ["text",    "  IBAN: [REDACTED_IBAN]"],
  ["blank"],
  ["text",    "  This agreement governs the employment relationship between"],
  ["text",    "  Flexorch Technology and the employee named above, including"],
  ["text",    "  confidentiality obligations and IP assignment clauses."],
  ["blank"],
];

// ── Layout ───────────────────────────────────────────────────────────────────

const FONT_SIZE = 14;
const LINE_H    = 22;
const PAD_X     = 24;
const PAD_Y     = 20;
const TITLE_H   = 38;
const WIDTH     = 720;
const HEIGHT    = TITLE_H + PAD_Y + LINES.length * LINE_H + PAD_Y;

const esc = (s) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

function renderLine(kind, ...parts) {
  if (kind === "blank") return "";
  if (kind === "kv") {
    const [label, value, rest] = parts;
    const cv = /^[A-Z]/.test(value) ? GREEN : CYAN;
    return `<tspan fill="${FG}">${esc(label)}</tspan>`
         + `<tspan fill="${cv}">${esc(value)}</tspan>`
         + `<tspan fill="${COMMENT}">${esc(rest)}</tspan>`;
  }
  const text = parts[0];
  const colorMap = { prompt: GREEN, label: CYAN, pii: YELLOW, text: FG };
  const color = colorMap[kind] ?? FG;
  if (text.includes("[REDACTED")) {
    const [before, after] = text.split(/(?=\[REDACTED)/);
    const [tag, ...rest2] = after.slice(1).split("]");
    return `<tspan fill="${FG}">${esc(before)}</tspan>`
         + `<tspan fill="${REDACTED}">[${esc(tag)}]</tspan>`
         + `<tspan fill="${FG}">${esc(rest2.join("]"))}</tspan>`;
  }
  return `<tspan fill="${color}">${esc(text)}</tspan>`;
}

// ── Build SVG ─────────────────────────────────────────────────────────────────

const parts = [];
parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" style="font-family:Consolas,'Courier New',monospace;font-size:${FONT_SIZE}px;">`);
parts.push(`  <rect width="${WIDTH}" height="${HEIGHT}" rx="8" fill="${BG}"/>`);
parts.push(`  <rect width="${WIDTH}" height="${TITLE_H}" rx="8" fill="#44475a"/>`);
parts.push(`  <rect y="${TITLE_H - 4}" width="${WIDTH}" height="4" fill="#44475a"/>`);
for (const [i, col] of [["#ff5555"], ["#f1fa8c"], ["#50fa7b"]].entries()) {
  parts.push(`  <circle cx="${16 + i * 20}" cy="${TITLE_H / 2}" r="6" fill="${col}"/>`);
}
parts.push(`  <text x="${WIDTH / 2}" y="${TITLE_H / 2 + 5}" text-anchor="middle" fill="${COMMENT}" font-size="13">@flexorch/audit</text>`);

const baseY = TITLE_H + PAD_Y;
LINES.forEach(([kind, ...rest], i) => {
  const inner = renderLine(kind, ...rest);
  if (!inner) return;
  const y = baseY + i * LINE_H + FONT_SIZE;
  parts.push(`  <text x="${PAD_X}" y="${y}">${inner}</text>`);
});

parts.push("</svg>");

// ── Write ─────────────────────────────────────────────────────────────────────

const outDir = join(__dirname, "..", "assets");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "demo.svg");
writeFileSync(outPath, parts.join("\n"), "utf8");
console.log(`Written: ${outPath}`);
