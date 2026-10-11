// Offline/PWA test against a production build. Usage: node tests/e2e/offline.mjs <baseUrl>
import { chromium } from "playwright-core";
import assert from "node:assert/strict";

const base = process.argv[2] ?? "http://localhost:3101";
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
const step = async (name, fn) => {
  try { await fn(); console.log("ok  ", name); } catch (e) { console.log("FAIL", name, "\n    ", String(e.message).split("\n")[0]); process.exitCode = 1; }
};

await step("service worker registers and activates", async () => {
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.getByText("New words").waitFor();
  const active = await page.evaluate(async () => (await navigator.serviceWorker.ready).active?.state);
  assert.equal(active, "activated");
});

await step("manifest and icons are served", async () => {
  const m = await (await page.request.get(base + "/manifest.webmanifest")).json();
  assert.equal(m.display, "standalone");
  for (const i of m.icons) assert.equal((await page.request.get(base + i.src)).status(), 200);
});

await step("download audio for offline use", async () => {
  await page.goto(base + "/settings", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Download audio" }).click();
  await page.getByText("Audio saved for offline use.").waitFor({ timeout: 60000 });
  const n = await page.evaluate(async () => (await (await caches.open("latin-audio-v3")).keys()).length);
  assert.ok(n > 900, `cached ${n} audio files`);
});

await step("visit pages once so they are cached", async () => {
  for (const p of ["/study", "/words", "/words/et", "/guide"]) await page.goto(base + p, { waitUntil: "networkidle" });
});

await ctx.setOffline(true);

await step("offline: home, study and words still load", async () => {
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.getByText("New words").waitFor({ timeout: 10000 });
  await page.goto(base + "/words", { waitUntil: "domcontentloaded" });
  await page.getByRole("searchbox").waitFor({ timeout: 10000 });
  await page.getByText("973 words").waitFor();
});

await step("offline: audio plays from cache (range request path)", async () => {
  await page.goto(base + "/words/et", { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "et" }).waitFor({ timeout: 10000 });
  const result = await page.evaluate(async () => {
    const a = new Audio("/audio/classical/279.mp3");
    return await new Promise((resolve) => {
      a.addEventListener("canplaythrough", () => resolve({ ok: true, dur: a.duration }));
      a.addEventListener("error", () => resolve({ ok: false, code: a.error?.code }));
      a.load();
    });
  });
  assert.ok(result.ok, JSON.stringify(result));
  assert.ok(result.dur > 0.2 && result.dur < 5, "duration " + result.dur);
});

await step("offline: a full study card works", async () => {
  await page.goto(base + "/study", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Start studying|Continue/ }).click();
  await page.getByRole("button", { name: "Show answer" }).click();
  await page.getByRole("button", { name: /^Good/ }).click();
});

console.log("page errors:", errors.length ? errors : "none");
if (errors.length) process.exitCode = 1;
await browser.close();
