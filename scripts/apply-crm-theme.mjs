import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("src");

const REPLACEMENTS = [
  ["bg-cyan-500/20", "bg-brand/15"],
  ["bg-cyan-500/10", "bg-brand/10"],
  ["bg-cyan-500/5", "bg-brand/5"],
  ["hover:bg-cyan-400", "hover:opacity-90"],
  ["hover:bg-cyan-500/30", "hover:bg-brand/20"],
  ["text-cyan-200", "text-brand"],
  ["text-cyan-300", "text-brand"],
  ["text-cyan-400", "text-brand"],
  ["text-cyan-500", "text-brand"],
  ["border-cyan-500/60", "border-brand/50"],
  ["border-cyan-500/40", "border-brand/40"],
  ["border-cyan-500/30", "border-brand/30"],
  ["hover:border-cyan-500/40", "hover:border-brand/40"],
  ["ring-cyan-500/60", "ring-brand/50"],
  ["bg-cyan-500 text-white", "crm-btn-primary"],
  ["bg-cyan-500 hover:bg-cyan-400", "crm-btn-primary hover:opacity-90"],
  ["bg-cyan-600", "bg-brand-muted"],
  ["bg-cyan-500", "bg-brand"],
  ["text-cyan-600", "text-brand-muted"],
  ["bg-slate-950/95", "bg-surface-deep/95"],
  ["bg-slate-950/90", "bg-surface-deep/90"],
  ["bg-slate-950", "bg-surface-deep"],
  ["bg-slate-900/70", "bg-surface/70"],
  ["bg-slate-900/50", "bg-surface/50"],
  ["bg-slate-900", "bg-surface"],
  ["bg-slate-800/60", "bg-surface-raised/60"],
  ["bg-slate-800/50", "bg-surface-raised/50"],
  ["bg-slate-800", "bg-surface-raised"],
  ["hover:bg-slate-700", "hover:bg-surface-hover"],
  ["hover:bg-slate-800", "hover:bg-surface-hover"],
  ["border-slate-800", "border-neutral-800"],
  ["border-slate-700", "border-neutral-700"],
  ["border-slate-600", "border-neutral-600"],
  ["divide-slate-800", "divide-neutral-800"],
  ["text-slate-500", "text-neutral-500"],
  ["text-slate-400", "text-neutral-400"],
  ["text-slate-300", "text-neutral-300"],
  ["text-slate-200", "text-neutral-200"],
  ["text-slate-100", "text-neutral-100"],
  ["bg-blue-500/20", "bg-brand/15"],
  ["bg-blue-500/10", "bg-brand/10"],
  ["text-blue-200", "text-brand"],
  ["text-blue-300", "text-brand"],
  ["text-blue-400", "text-brand"],
  ["border-blue-500/40", "border-brand/40"],
  ["border-blue-500/30", "border-brand/30"],
  ["bg-blue-500", "bg-brand"],
  ["from-cyan-500", "from-brand"],
  ["to-cyan-500", "to-brand"],
  ["focus:ring-cyan-500", "focus:ring-brand"],
  ["hover:bg-cyan-700", "hover:bg-brand-dim"],
  ["bg-cyan-400", "bg-brand"],
  ["border-cyan-500/20", "border-brand/20"],
  ["border-cyan-400", "border-brand"],
  ["text-cyan-100", "text-brand"],
  ["from-slate-900 to-slate-800", "from-surface to-surface-raised"],
  ["hover:border-cyan-400/60", "hover:border-brand/60"],
  ["bg-slate-700", "bg-surface-hover"],
  ["hover:bg-slate-600", "hover:bg-neutral-600"],
  ["bg-slate-600", "bg-neutral-600"],
  ["bg-slate-500", "bg-neutral-500"],
  ["text-slate-950", "text-brand-fg"],
  ["hover:bg-blue-600", "hover:bg-brand-muted"],
  ["w-full bg-green-500", "w-full crm-btn-primary"],
  ["bg-green-500 hover:bg-green-600", "crm-btn-primary hover:opacity-90"],
  ["bg-green-500 hover:bg-green-400", "crm-btn-primary hover:opacity-90"],
  ["bg-green-500\n", "crm-btn-primary\n"],
  ["focus:border-cyan-500", "focus:border-brand"],
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (/\.(jsx?|css)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

let changedFiles = 0;

for (const file of walk(ROOT)) {
  let content = fs.readFileSync(file, "utf8");
  let next = content;

  for (const [from, to] of REPLACEMENTS) {
    next = next.split(from).join(to);
  }

  if (next !== content) {
    fs.writeFileSync(file, next, "utf8");
    changedFiles += 1;
  }
}

console.log(`Updated ${changedFiles} files.`);
