#!/usr/bin/env node
// Monitor de RAM do processo next-server (só ele). Lê VmRSS de /proc, ao vivo.
//
// Uso:
//   node scripts/mem-monitor.mjs                 # ao vivo, amostra a cada 500ms
//   node scripts/mem-monitor.mjs --interval 250  # intervalo em ms
//   node scripts/mem-monitor.mjs --csv mem.csv   # também grava CSV (ts,rss_mb)
//   node scripts/mem-monitor.mjs --name next-server   # processo alvo (comm)
//
// Também exporta findPid() e readRssMb() para outros scripts (ex.: testes de perf).
import { readdir, readFile, appendFile } from "node:fs/promises";

const args = process.argv.slice(2);
function opt(flag, def) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
}

const TARGET = opt("--name", "next-server");
const INTERVAL = Number(opt("--interval", "500"));
const CSV = opt("--csv", null);

// Acha o PID pelo comm exato (/proc/<pid>/comm). comm é truncado em 15 chars,
// então usamos startsWith para casar "next-server".
export async function findPid(name = TARGET) {
  const entries = await readdir("/proc");
  for (const e of entries) {
    if (!/^\d+$/.test(e)) continue;
    try {
      const comm = (await readFile(`/proc/${e}/comm`, "utf8")).trim();
      if (comm === name || comm.startsWith(name.slice(0, 15))) return Number(e);
    } catch {
      /* processo sumiu entre readdir e read */
    }
  }
  return null;
}

// VmRSS (MB) de um PID, ou null se sumiu.
export async function readRssMb(pid) {
  try {
    const status = await readFile(`/proc/${pid}/status`, "utf8");
    const m = status.match(/VmRSS:\s+(\d+)\s+kB/);
    return m ? Number(m[1]) / 1024 : null;
  } catch {
    return null;
  }
}

// Execução direta (CLI). Import como módulo não dispara isto.
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  console.log(`Monitorando "${TARGET}" a cada ${INTERVAL}ms. Ctrl+C para sair.`);
  if (CSV) await appendFile(CSV, "timestamp,rss_mb\n").catch(() => {});
  let pid = await findPid();
  let peak = 0;
  let min = Infinity;
  const start = Date.now();

  setInterval(async () => {
    if (pid == null || (await readRssMb(pid)) == null) pid = await findPid();
    if (pid == null) {
      process.stdout.write(`\r${TARGET} não encontrado (servidor rodando?)          `);
      return;
    }
    const rss = await readRssMb(pid);
    if (rss == null) return;
    peak = Math.max(peak, rss);
    min = Math.min(min, rss);
    const t = ((Date.now() - start) / 1000).toFixed(0);
    process.stdout.write(
      `\r[${t}s] pid ${pid}  RSS ${rss.toFixed(0)} MB   ` +
        `min ${min.toFixed(0)}  pico ${peak.toFixed(0)} MB        `,
    );
    if (CSV) await appendFile(CSV, `${Date.now()},${rss.toFixed(1)}\n`).catch(() => {});
  }, INTERVAL);
}
