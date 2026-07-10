/**
 * 모듈 순환 참조 탐지기.
 *
 * biome 의 noRestrictedImports 는 레이어 경계를 막아주지만 순환은 못 잡는다.
 * 특히 배럴(index.ts)을 경유한 순환은 타입 import 로 가려져 있다가, 누군가
 * 값 import 로 바꾸는 순간 런타임 오류가 된다.
 *
 * 사용: node scripts/check-cycles.mjs
 * 값 import 순환이 하나라도 있으면 exit 1.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const files = execSync('git ls-files "*.ts" "*.tsx"', { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter((f) => fs.existsSync(path.join(ROOT, f)));

const resolveModule = (p) => {
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const full = path.join(ROOT, p + ext);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) return (p + ext).replace(/\\/g, "/");
  }
  return null;
};

const resolveSpec = (spec, fromFile) => {
  if (spec.startsWith("@/")) return resolveModule(spec.slice(2));
  if (spec.startsWith("."))
    return resolveModule(path.posix.join(path.posix.dirname(fromFile), spec));
  return null;
};

const buildGraph = (includeTypeOnly) => {
  const graph = new Map();
  for (const file of files) {
    const src = fs.readFileSync(path.join(ROOT, file), "utf8");
    const deps = new Set();

    const importRe = /^\s*(?:import|export)\s+([\s\S]*?)from\s+["']([^"']+)["']/gm;
    let m;
    while ((m = importRe.exec(src))) {
      if (/^\s*type\s/.test(m[1]) && !includeTypeOnly) continue;
      const resolved = resolveSpec(m[2], file);
      if (resolved) deps.add(resolved);
    }

    const starRe = /^\s*export\s+\*\s+from\s+["']([^"']+)["']/gm;
    while ((m = starRe.exec(src))) {
      const resolved = resolveSpec(m[1], file);
      if (resolved) deps.add(resolved);
    }

    graph.set(file, [...deps]);
  }
  return graph;
};

const findCycles = (graph) => {
  const cycles = [];
  const state = new Map();
  const stack = [];

  const visit = (node) => {
    state.set(node, 1);
    stack.push(node);
    for (const dep of graph.get(node) ?? []) {
      if (!graph.has(dep)) continue;
      if (state.get(dep) === 1) cycles.push([...stack.slice(stack.indexOf(dep)), dep]);
      else if (!state.has(dep)) visit(dep);
    }
    stack.pop();
    state.set(node, 2);
  };

  for (const node of graph.keys()) if (!state.has(node)) visit(node);
  return cycles;
};

const report = (label, includeTypeOnly) => {
  const cycles = findCycles(buildGraph(includeTypeOnly));
  const unique = new Map();
  for (const c of cycles) unique.set([...c].sort().join("|"), c);

  console.log(`\n### ${label}: ${unique.size}건`);
  for (const c of unique.values()) console.log(`  ${c.join("\n    -> ")}`);
  return unique.size;
};

const runtimeCycles = report("값 import 만 (런타임 순환)", false);
report("import type 포함 (구조적 순환)", true);

if (runtimeCycles > 0) {
  console.error("\n런타임 순환 참조가 있습니다.");
  process.exit(1);
}
