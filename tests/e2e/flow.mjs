// End-to-end flow test. Usage: node tests/e2e/flow.mjs <baseUrl>
import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import fs from "node:fs";

const base = process.argv[2] ?? "http://localhost:3100";
const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));
const audioRequests = [];
page.on("response", (r) => r.url().includes("/audio/") && audioRequests.push([r.url(), r.status(), r.headers()["content-type"]]));

const step = async (name, fn) => {
  try {
    await fn();
    console.log("ok  ", name);
  } catch (e) {
    console.log("FAIL", name, "\n    ", String(e.message).split("\n")[0]);
    process.exitCode = 1;
  }
};
const progress = () => page.evaluate(() => JSON.parse(localStorage.getItem("latin.progress.v1") ?? "null"));

await step("home loads with 10 new words", async () => {
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.getByText("New words").waitFor();
  assert.equal(await page.locator("p.text-accent").first().innerText(), "10");
});

await step("study session: review all 10 cards", async () => {
  await page.getByRole("link", { name: "Start studying" }).click();
  await page.getByRole("button", { name: "Start studying" }).click();
  for (let i = 0; i < 10; i++) {
    await page.getByRole("button", { name: "Show answer" }).click();
    await page.getByRole("button", { name: "Good", exact: false }).first().click();
  }
  await page.getByText("Session complete").waitFor();
  const p = await progress();
  assert.equal(Object.keys(p.cards).length, 10);
  assert.equal(Object.values(p.log)[0].reviews, 10);
  assert.equal(Object.values(p.log)[0].newCards, 10);
});

await step("progress persists across reload; no new words left today", async () => {
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.getByText("All done for today").waitFor();
  await page.getByText("Day streak").waitFor();
  assert.equal((await progress()).settings.newPerDay, 10);
});

await step("'learn more' pulls 5 extra new words", async () => {
  await page.getByRole("link", { name: "Learn 5 more words" }).click();
  await page.getByRole("button", { name: "Start studying" }).click();
  await page.getByText("5", { exact: true }).first().waitFor().catch(() => {});
  await page.getByRole("button", { name: "Show answer" }).waitFor();
  await page.getByRole("button", { name: "Again" }).count();
});

await step("failed card returns within the session", async () => {
  await page.getByRole("button", { name: "Show answer" }).click();
  const firstWord = await page.locator("h1").first().innerText();
  await page.getByRole("button", { name: /^Again/ }).click();
  const seen = [];
  // 5 cards were queued; the failed one is re-inserted, so 5 more cards remain after the first answer.
  for (let i = 0; i < 5; i++) {
    await page.getByRole("button", { name: "Show answer" }).click();
    seen.push(await page.locator("h1").first().innerText());
    await page.getByRole("button", { name: /^Good/ }).click();
  }
  assert.ok(seen.includes(firstWord), `${firstWord} not re-shown in ${seen}`);
  await page.getByText("Session complete").waitFor();
});

await step("words: search by meaning and by Latin without macrons", async () => {
  await page.goto(base + "/words", { waitUntil: "networkidle" });
  await page.getByRole("searchbox").fill("love");
  await page.getByText("amor", { exact: false }).first().waitFor();
  await page.getByRole("searchbox").fill("amicitia");
  await page.getByText("amīcitia", { exact: false }).first().waitFor();
  await page.getByRole("searchbox").fill("zzzz");
  await page.getByText("No words match.").waitFor();
});

await step("word detail page and audio request", async () => {
  await page.goto(base + "/words/51", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "amor" }).waitFor();
  await page.getByRole("button", { name: "Play audio (Classical)" }).click();
  await page.waitForTimeout(800);
  const hit = audioRequests.find(([u]) => u.includes("/audio/classical/51.mp3"));
  assert.ok(hit, "no audio request: " + JSON.stringify(audioRequests));
  assert.ok([200, 206].includes(hit[1]), "status " + hit[1]);
  assert.match(hit[2], /audio/);
});

await step("one pronunciation by default; 'Both' in settings shows each, for the word and its sentence", async () => {
  assert.equal(await page.getByRole("button", { name: "Play audio (Ecclesiastical)" }).count(), 0);
  await page.getByRole("button", { name: "Play audio: amōrem" }).first().click(); // a form in the table
  await page.waitForTimeout(800);
  assert.ok(audioRequests.some(([u]) => u.includes("/audio/classical/f/amo_rem.mp3")), "form audio requested");
  await page.goto(base + "/settings", { waitUntil: "networkidle" });
  await page.getByRole("radio", { name: /button for each system/ }).click();
  await page.goto(base + "/words/51", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Play audio (Ecclesiastical)" }).click();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Play sentence (Classical)" }).click();
  await page.waitForTimeout(800);
  const ok = (path) => audioRequests.some(([u, s]) => u.includes(path) && (s === 200 || s === 206));
  assert.ok(ok("/audio/ecclesiastical/51.mp3"), "word, ecclesiastical");
  assert.ok(ok("/audio/classical/s/51.mp3"), "sentence, classical");
});

await step("form drill: a full round, then the related-words section", async () => {
  await page.goto(base + "/drill", { waitUntil: "networkidle" });
  // a round has up to 10 questions (fewer when few words have been studied)
  for (let q = 0; q < 10 && !(await page.getByText("Round complete").isVisible()); q++) {
    await page.locator("section").nth(0).getByRole("button").first().click();
    await page.locator("section").nth(1).getByRole("button").first().click();
    await page.getByRole("button", { name: "Next" }).click();
  }
  await page.getByText("Round complete").waitFor({ timeout: 2000 });
  await page.goto(base + "/words/761", { waitUntil: "networkidle" });
  await page.getByText("Related words").waitFor();
  await page.getByText("regal, royal, reign").waitFor();
});

await step("switch UI to Chinese", async () => {
  await page.goto(base + "/settings", { waitUntil: "networkidle" });
  await page.getByRole("radio", { name: "中文" }).first().click();
  await page.getByRole("heading", { name: "设置" }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.lang), "zh-Hans");
});

await step("Traditional Chinese script applies to UI and glosses", async () => {
  await page.getByRole("radio", { name: "繁體" }).click();
  await page.getByRole("heading", { name: "設定" }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.lang), "zh-Hant");
  await page.getByRole("radio", { name: "双语" }).or(page.getByRole("radio", { name: "雙語" })).first().click();
  await page.goto(base + "/words/14", { waitUntil: "networkidle" });
  const text = await page.locator("main").innerText();
  assert.match(text, /詞性|副詞/, "expected Traditional labels");
  assert.doesNotMatch(text, /副词/, "simplified leaked through");
  await page.goto(base + "/settings", { waitUntil: "networkidle" });
  await page.getByRole("radio", { name: "简体" }).click();
  await page.getByRole("heading", { name: "设置" }).waitFor();
});

await step("export progress downloads valid JSON, then import restores it", async () => {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "导出进度" }).click()]);
  const file = "/tmp/latin-export.json";
  await dl.saveAs(file);
  const exported = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(exported.version, 1);
  assert.ok(Object.keys(exported.cards).length >= 10);
  // wipe, then import
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "重置进度" }).click();
  assert.equal(Object.keys((await progress()).cards).length, 0);
  page.once("dialog", (d) => d.accept());
  await page.locator("input[type=file]").setInputFiles(file);
  await page.getByText("进度已导入。").waitFor();
  assert.equal(Object.keys((await progress()).cards).length, Object.keys(exported.cards).length);
});

await step("guide page renders in Chinese", async () => {
  await page.goto(base + "/guide", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "发音与阅读指南" }).waitFor();
});

console.log("console errors:", errors.length ? errors : "none");
if (errors.length) process.exitCode = 1;
await browser.close();
