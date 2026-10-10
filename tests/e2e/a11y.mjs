// Accessibility + small-screen checks. Usage: node tests/e2e/a11y.mjs <baseUrl> [outDir]
import { chromium } from "playwright-core";
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const base = process.argv[2] ?? "http://localhost:3101";
const out = process.argv[3];
if (out) fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });

let failures = 0;
for (const scheme of ["light", "dark"]) {
  for (const [w, h] of [[390, 844], [320, 568]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const targets = ["/", "/words", "/words/279", "/settings", "/guide", "/study", "/drill"];
    for (const path of targets) {
      await page.goto(base + path, { waitUntil: "networkidle" });
      if (path === "/study") {
        await page.getByRole("button", { name: /Start studying|Continue/ }).click();
        await page.getByRole("button", { name: "Show answer" }).click();
      }
      await page.waitForTimeout(150);
      await page.evaluate(axeSource);
      const res = await page.evaluate(async () => {
        const r = await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "best-practice"] });
        return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ") + " :: " + (n.failureSummary || "").split("\n")[1]) }));
      });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      const tag = `${scheme} ${w}x${h} ${path}`;
      if (res.length || overflow > 0) {
        failures++;
        console.log("ISSUES", tag, overflow > 0 ? `horizontal overflow ${overflow}px` : "");
        for (const v of res) console.log("   ", v.impact, v.id, JSON.stringify(v.nodes));
      } else console.log("clean ", tag);
      if (out && w === 390) await page.screenshot({ path: `${out}/${scheme}-${path.replace(/\//g, "_") || "home"}.png` });
    }
    await ctx.close();
  }
}
await browser.close();
process.exitCode = failures ? 1 : 0;
