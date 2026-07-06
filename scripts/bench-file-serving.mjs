#!/usr/bin/env node
// Compara a RAM do processo servidor ao servir arquivos das duas formas:
//   buffer = readFile do arquivo inteiro na memória (jeito antigo do /api/files)
//   stream = createReadStream (jeito atual)
// Sobe um servidor http mínimo (processo filho, fresco a cada teste, sem
// stickiness do V8), bombardeia com N requisições concorrentes via curl e mede
// o pico de VmRSS. Isola o custo de servir — sem ruído de compilação do Next.
//
// Uso:
//   node scripts/bench-file-serving.mjs [--conc N] arquivo1.pdf [arquivo2.pdf ...]
import { spawn } from "node:child_process";
import { readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const ci = args.indexOf("--conc");
const CONC = ci >= 0 ? Number(args[ci + 1]) : 12;
const files = args.filter((a, i) => a !== "--conc" && args[i - 1] !== "--conc");
if (files.length === 0) {
  console.error("uso: node scripts/bench-file-serving.mjs [--conc N] <arquivo...>");
  process.exit(1);
}

// Servidor efêmero gravado num tmp: MODE decide buffer vs stream.
const serverSrc = `
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
const [,,MODE,PORT,FILE]=process.argv;
const size=(await stat(FILE)).size;
http.createServer(async (req,res)=>{
  if(MODE==="buffer"){const b=await readFile(FILE);const c=new Uint8Array(b);res.writeHead(200,{"content-length":c.length});res.end(Buffer.from(c.buffer));}
  else{res.writeHead(200,{"content-length":size});createReadStream(FILE).pipe(res);}
}).listen(Number(PORT),()=>console.log("READY"));
`;
const serverPath = join(tmpdir(), `bench-serve-${process.pid}.mjs`);
await writeFile(serverPath, serverSrc);

async function vmrss(pid) {
  try {
    const s = await readFile(`/proc/${pid}/status`, "utf8");
    const m = s.match(/VmRSS:\s+(\d+) kB/);
    return m ? Number(m[1]) / 1024 : 0;
  } catch {
    return 0;
  }
}
function curlN(port, n) {
  return Promise.all(
    Array.from({ length: n }, () =>
      new Promise((res) => spawn("curl", ["-s", "-o", "/dev/null", `http://127.0.0.1:${port}/f`]).on("close", res)),
    ),
  );
}
async function run(mode, port, file) {
  const child = spawn("node", [serverPath, mode, String(port), file]);
  await new Promise((r) => child.stdout.on("data", (d) => String(d).includes("READY") && r()));
  await new Promise((r) => setTimeout(r, 250));
  let peak = await vmrss(child.pid);
  const base = peak;
  for (let round = 0; round < 5; round++) {
    const p = curlN(port, CONC);
    const iv = setInterval(async () => { peak = Math.max(peak, await vmrss(child.pid)); }, 12);
    await p;
    clearInterval(iv);
    peak = Math.max(peak, await vmrss(child.pid));
  }
  child.kill("SIGKILL");
  return peak - base;
}

console.log(`\nServir arquivo — RAM extra do processo servidor (concorrência ${CONC})`);
console.log("arquivo".padEnd(22) + "tamanho".padEnd(10) + "ANTIGO(buffer)".padEnd(16) + "NOVO(stream)");
let port = 8850;
for (const f of files) {
  const size = ((await stat(f)).size / 1048576).toFixed(1);
  const buf = await run("buffer", port++, f);
  const str = await run("stream", port++, f);
  const name = f.split("/").pop();
  console.log(name.slice(0, 20).padEnd(22) + `${size}MB`.padEnd(10) + `+${buf.toFixed(0)}MB`.padEnd(16) + `+${str.toFixed(0)}MB`);
}
