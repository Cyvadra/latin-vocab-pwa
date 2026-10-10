const GENDER = /^(m|f|n|c)\.?(\/(m|f|n|c)\.?)*[;,]?$|^pl\.$|^and$/;

export interface HeadwordParts {
  forms: string[];
  note: string;
}

/** "arma -ōrum n. pl." -> { forms: ["arma", "-ōrum"], note: "n. pl." } */
export function parseHeadword(hw: string): HeadwordParts[] {
  return hw.split(";").map((chunk) => {
    const tokens = chunk.trim().split(/\s+/).filter(Boolean);
    const cut = tokens.findIndex((tok, i) => i > 0 && (tok.startsWith("(") || GENDER.test(tok)));
    const forms = cut === -1 ? tokens : tokens.slice(0, cut);
    const note = cut === -1 ? "" : tokens.slice(cut).join(" ");
    return { forms, note };
  });
}

export function formatHeadword(hw: string): string {
  return parseHeadword(hw)
    .map((p) => p.forms.join(", ") + (p.note ? ` ${p.note}` : ""))
    .join("; ");
}

/** "3d", "2mo" style interval for rating buttons. */
export function shortInterval(days: number, labels: { min: string; d: string; mo: string }): string {
  if (days <= 0) return labels.min;
  if (days < 30) return `${days}${labels.d}`;
  return `${Math.round(days / 30)}${labels.mo}`;
}

/** Stable pseudo-random pick so a card keeps the same front within a day. */
export function hashPick(id: number, salt: number, n: number): number {
  let h = (id * 2654435761 + salt * 40503) >>> 0;
  h ^= h >>> 15;
  return h % n;
}
