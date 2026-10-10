import * as OpenCC from "opencc-js";

/** Glosses: Simplified -> Traditional characters only (Taiwan standard, no vocabulary swaps). */
export const toHant: (s: string) => string = OpenCC.Converter({ from: "cn", to: "tw" });

/** Interface text: also swaps Taiwan software vocabulary (设置 -> 設定, 下载 -> 下載, 文件 -> 檔案). */
export const toHantUi: (s: string) => string = OpenCC.Converter({ from: "cn", to: "twp" });

/** Convert every string inside a JSON-like value with the UI converter. */
export function convertDeep<T>(v: T): T {
  if (typeof v === "string") return toHantUi(v) as T;
  if (Array.isArray(v)) return v.map(convertDeep) as T;
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, convertDeep(x)])) as T;
  }
  return v;
}
