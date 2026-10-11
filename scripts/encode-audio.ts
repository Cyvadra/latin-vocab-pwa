// Encode tts/out/<system>/<id>.wav -> public/audio/<system>/<id>.mp3 (mono, ~48 kbps VBR).
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const SYSTEMS = ["classical", "classical-alt", "ecclesiastical"];

function encode(src: string, dst: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-ac", "1", "-codec:a", "libmp3lame", "-q:a", "6", dst]);
    let err = "";
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${src}: ${err}`))));
  });
}

async function main() {
  const jobs: [string, string][] = [];
  // words: tts/out/<system>/*.wav; example sentences: …/s/*.wav; inflected forms: …/f/<formKey>.wav
  for (const system of SYSTEMS.flatMap((s) => [s, `${s}/s`, `${s}/f`])) {
    const inDir = path.join(root, "tts", "out", system);
    if (!fs.existsSync(inDir)) continue;
    const outDir = path.join(root, "public", "audio", system);
    fs.mkdirSync(outDir, { recursive: true });
    for (const f of fs.readdirSync(inDir).filter((f) => f.endsWith(".wav"))) {
      const dst = path.join(outDir, f.replace(/\.wav$/, ".mp3"));
      const src = path.join(inDir, f);
      if (!fs.existsSync(dst) || fs.statSync(dst).mtimeMs < fs.statSync(src).mtimeMs) jobs.push([src, dst]);
    }
  }
  let next = 0;
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      while (next < jobs.length) {
        const [src, dst] = jobs[next++];
        await encode(src, dst);
      }
    })
  );
  console.log(`Encoded ${jobs.length} files`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
